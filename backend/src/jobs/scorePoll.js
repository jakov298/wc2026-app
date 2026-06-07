import axios   from 'axios'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const AF = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY },
})

// Maps API-Football team names → our team IDs
// You'll need to verify these against the actual API response for your account
const TEAM_MAP = {
  'Mexico': 'MEX', 'South Africa': 'RSA', 'South Korea': 'KOR', 'Czechia': 'CZE',
  'Canada': 'CAN', 'Bosnia': 'BIH', 'Qatar': 'QAT', 'Switzerland': 'SUI',
  'Brazil': 'BRA', 'Morocco': 'MAR', 'Haiti': 'HAI', 'Scotland': 'SCO',
  'United States': 'USA', 'Paraguay': 'PAR', 'Australia': 'AUS', 'Turkey': 'TUR',
  'Germany': 'GER', 'Curacao': 'CUW', "Ivory Coast": 'CIV', 'Ecuador': 'ECU',
  'Netherlands': 'NED', 'Japan': 'JPN', 'Sweden': 'SWE', 'Tunisia': 'TUN',
  'Belgium': 'BEL', 'Egypt': 'EGY', 'Iran': 'IRN', 'New Zealand': 'NZL',
  'Spain': 'ESP', 'Cape Verde': 'CPV', 'Saudi Arabia': 'KSA', 'Uruguay': 'URU',
  'France': 'FRA', 'Senegal': 'SEN', 'Iraq': 'IRQ', 'Norway': 'NOR',
  'Argentina': 'ARG', 'Algeria': 'ALG', 'Austria': 'AUT', 'Jordan': 'JOR',
  'Portugal': 'POR', 'DR Congo': 'COD', 'Uzbekistan': 'UZB', 'Colombia': 'COL',
  'England': 'ENG', 'Croatia': 'CRO', 'Ghana': 'GHA', 'Panama': 'PAN',
}

// Maps API-Football fixture ID strings to our fixture IDs
// Run the script below once to build this mapping after you have API access
let fixtureIdMap = {}

export async function pollLiveScores() {
  const { data } = await AF.get('/fixtures', {
    params: { live: 'all', league: 1, season: 2026 },
  })
  if (!data.response?.length) return

  for (const f of data.response) {
    await upsertResult(f)
  }
}

export async function syncTodayResults() {
  const today = new Date().toISOString().split('T')[0]
  const { data } = await AF.get('/fixtures', {
    params: { date: today, league: 1, season: 2026, status: 'FT' },
  })
  if (!data.response?.length) return

  for (const f of data.response) {
    await upsertResult(f)
  }
}

async function upsertResult(f) {
  const homeId = TEAM_MAP[f.teams?.home?.name]
  const awayId = TEAM_MAP[f.teams?.away?.name]
  if (!homeId || !awayId) {
    console.warn('Unknown team:', f.teams?.home?.name, f.teams?.away?.name)
    return
  }

  const hScore = f.goals?.home
  const aScore = f.goals?.away
  if (hScore === null || aScore === null) return

  // Try to find our fixture ID by matching teams
  const { data: existing } = await supabase
    .from('results')
    .select('fixture_id')
    .eq('home_team', homeId)
    .eq('away_team', awayId)
    .single()

  // Build fixture_id from team pair if not already stored
  const fixtureId = existing?.fixture_id || `${homeId}_${awayId}`

  await supabase.from('results').upsert({
    fixture_id:  fixtureId,
    home_team:   homeId,
    away_team:   awayId,
    home_score:  hScore,
    away_score:  aScore,
    played_at:   f.fixture?.date || new Date().toISOString(),
    api_id:      f.fixture?.id,
    status:      f.fixture?.status?.short,
  }, { onConflict: 'fixture_id' })
}

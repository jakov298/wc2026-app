import axios   from 'axios'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const AF = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY },
})

const TEAM_MAP = {
  'Mexico': 'MEX', 'South Africa': 'RSA', 'South Korea': 'KOR',
  'Czech Republic': 'CZE', 'Czechia': 'CZE',
  'Canada': 'CAN', 'Bosnia & Herzegovina': 'BIH', 'Bosnia': 'BIH',
  'Qatar': 'QAT', 'Switzerland': 'SUI',
  'Brazil': 'BRA', 'Morocco': 'MAR', 'Haiti': 'HAI', 'Scotland': 'SCO',
  'United States': 'USA', 'USA': 'USA',
  'Paraguay': 'PAR', 'Australia': 'AUS',
  'Turkey': 'TUR', 'Türkiye': 'TUR',
  'Germany': 'GER', 'Curacao': 'CUW', 'Curaçao': 'CUW',
  'Ivory Coast': 'CIV', "Côte d'Ivoire": 'CIV',
  'Ecuador': 'ECU',
  'Netherlands': 'NED', 'Japan': 'JPN', 'Sweden': 'SWE', 'Tunisia': 'TUN',
  'Belgium': 'BEL', 'Egypt': 'EGY', 'Iran': 'IRN', 'New Zealand': 'NZL',
  'Spain': 'ESP',
  'Cape Verde': 'CPV', 'Cabo Verde': 'CPV', 'Cape Verde Islands': 'CPV',
  'Saudi Arabia': 'KSA', 'Uruguay': 'URU',
  'France': 'FRA', 'Senegal': 'SEN', 'Iraq': 'IRQ', 'Norway': 'NOR',
  'Argentina': 'ARG', 'Algeria': 'ALG', 'Austria': 'AUT', 'Jordan': 'JOR',
  'Portugal': 'POR', 'DR Congo': 'COD', 'Congo DR': 'COD', 'Democratic Republic of Congo': 'COD',
  'Uzbekistan': 'UZB', 'Colombia': 'COL',
  'England': 'ENG', 'Croatia': 'CRO', 'Ghana': 'GHA', 'Panama': 'PAN',
}

// API fixture ID → our internal fixture ID
const API_FIXTURE_MAP = {
  1489369:'A1', 1538999:'A2', 1539004:'A3', 1489388:'A4', 1539010:'A5', 1489407:'A6',
  1539000:'B1', 1489373:'B2', 1539005:'B3', 1489387:'B4', 1489408:'B5', 1539009:'B6',
  1489371:'C1', 1489372:'C2', 1489390:'C3', 1489389:'C4', 1489405:'C5', 1489406:'C6',
  1489370:'D1', 1539001:'D2', 1489391:'D3', 1539006:'D4', 1539012:'D5', 1489411:'D6',
  1489374:'E1', 1489375:'E2', 1489393:'E3', 1489392:'E4', 1489410:'E5', 1489409:'E6',
  1489376:'F1', 1539002:'F2', 1539007:'F3', 1489394:'F4', 1539011:'F5', 1489412:'F6',
  1489377:'G1', 1489378:'G2', 1489395:'G3', 1489396:'G4', 1489414:'G5', 1489415:'G6',
  1489380:'H1', 1489379:'H2', 1489397:'H3', 1489398:'H4', 1489417:'H5', 1489413:'H6',
  1489383:'I1', 1539016:'I2', 1539017:'I3', 1489401:'I4', 1539074:'I5', 1489416:'I6',
  1489381:'J1', 1489382:'J2', 1489399:'J3', 1489400:'J4', 1489418:'J5', 1489421:'J6',
  1539003:'K1', 1489386:'K2', 1489404:'K3', 1539008:'K4', 1489419:'K5', 1539013:'K6',
  1489384:'L1', 1489385:'L2', 1489402:'L3', 1489403:'L4', 1489420:'L5', 1489422:'L6',
}

export async function pollLiveScores() {
  try {
    const { data } = await AF.get('/fixtures', {
      params: { live: 'all', league: 1, season: 2026 },
    })
    if (!data.response?.length) return
    for (const f of data.response) await upsertResult(f)
  } catch (e) {
    console.error('pollLiveScores error:', e.message)
  }
}

export async function syncTodayResults() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await AF.get('/fixtures', {
      params: { date: today, league: 1, season: 2026, status: 'FT' },
    })
    if (!data.response?.length) return
    for (const f of data.response) await upsertResult(f)
  } catch (e) {
    console.error('syncTodayResults error:', e.message)
  }
}

async function upsertResult(f) {
  const homeId    = TEAM_MAP[f.teams?.home?.name]
  const awayId    = TEAM_MAP[f.teams?.away?.name]
  const fixtureId = API_FIXTURE_MAP[f.fixture?.id]

  if (!homeId || !awayId) {
    console.warn('Unknown team:', f.teams?.home?.name, f.teams?.away?.name)
    return
  }
  if (!fixtureId) {
    console.warn('Unknown fixture API id:', f.fixture?.id)
    return
  }

  const hScore = f.goals?.home
  const aScore = f.goals?.away
  if (hScore === null || aScore === null) return

  await supabase.from('results').upsert({
    fixture_id: fixtureId,
    home_team:  homeId,
    away_team:  awayId,
    home_score: hScore,
    away_score: aScore,
    played_at:  f.fixture?.date || new Date().toISOString(),
    api_id:     f.fixture?.id,
    status:     f.fixture?.status?.short,
  }, { onConflict: 'fixture_id' })

  console.log(`Updated: ${fixtureId} ${homeId} ${hScore}-${aScore} ${awayId}`)
}

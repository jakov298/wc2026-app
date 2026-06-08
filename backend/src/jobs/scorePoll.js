import axios   from 'axios'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const AF = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY },
})

const TEAM_MAP = {
  'Mexico': 'MEX', 'South Africa': 'RSA', 'South Korea': 'KOR', 'Czechia': 'CZE',
  'Canada': 'CAN', 'Bosnia': 'BIH', 'Qatar': 'QAT', 'Switzerland': 'SUI',
  'Brazil': 'BRA', 'Morocco': 'MAR', 'Haiti': 'HAI', 'Scotland': 'SCO',
  'United States': 'USA', 'Paraguay': 'PAR', 'Australia': 'AUS', 'Turkey': 'TUR',
  'Germany': 'GER', 'Curacao': 'CUW', 'Ivory Coast': 'CIV', 'Ecuador': 'ECU',
  'Netherlands': 'NED', 'Japan': 'JPN', 'Sweden': 'SWE', 'Tunisia': 'TUN',
  'Belgium': 'BEL', 'Egypt': 'EGY', 'Iran': 'IRN', 'New Zealand': 'NZL',
  'Spain': 'ESP', 'Cape Verde': 'CPV', 'Saudi Arabia': 'KSA', 'Uruguay': 'URU',
  'France': 'FRA', 'Senegal': 'SEN', 'Iraq': 'IRQ', 'Norway': 'NOR',
  'Argentina': 'ARG', 'Algeria': 'ALG', 'Austria': 'AUT', 'Jordan': 'JOR',
  'Portugal': 'POR', 'DR Congo': 'COD', 'Uzbekistan': 'UZB', 'Colombia': 'COL',
  'England': 'ENG', 'Croatia': 'CRO', 'Ghana': 'GHA', 'Panama': 'PAN',
}

const FIXTURE_MAP = {
  'MEX_RSA': 'A1', 'KOR_CZE': 'A2', 'CZE_RSA': 'A3', 'MEX_KOR': 'A4', 'CZE_MEX': 'A5', 'RSA_KOR': 'A6',
  'CAN_BIH': 'B1', 'QAT_SUI': 'B2', 'SUI_BIH': 'B3', 'CAN_QAT': 'B4', 'BIH_QAT': 'B5', 'SUI_CAN': 'B6',
  'HAI_SCO': 'C1', 'BRA_MAR': 'C2', 'SCO_MAR': 'C3', 'BRA_HAI': 'C4', 'SCO_BRA': 'C5', 'MAR_HAI': 'C6',
  'USA_PAR': 'D1', 'AUS_TUR': 'D2', 'PAR_TUR': 'D3', 'USA_AUS': 'D4', 'TUR_USA': 'D5', 'PAR_AUS': 'D6',
  'GER_CUW': 'E1', 'CIV_ECU': 'E2', 'ECU_CUW': 'E3', 'GER_CIV': 'E4', 'CUW_CIV': 'E5', 'ECU_GER': 'E6',
  'NED_TUN': 'F1', 'JPN_SWE': 'F2', 'SWE_TUN': 'F3', 'NED_JPN': 'F4', 'TUN_JPN': 'F5', 'SWE_NED': 'F6',
  'BEL_EGY': 'G1', 'IRN_NZL': 'G2', 'EGY_NZL': 'G3', 'BEL_IRN': 'G4', 'NZL_BEL': 'G5', 'EGY_IRN': 'G6',
  'ESP_CPV': 'H1', 'KSA_URU': 'H2', 'CPV_URU': 'H3', 'ESP_KSA': 'H4', 'URU_ESP': 'H5', 'CPV_KSA': 'H6',
  'FRA_SEN': 'I1', 'IRQ_NOR': 'I2', 'SEN_NOR': 'I3', 'FRA_IRQ': 'I4', 'NOR_FRA': 'I5', 'SEN_IRQ': 'I6',
  'ARG_ALG': 'J1', 'AUT_JOR': 'J2', 'ALG_JOR': 'J3', 'ARG_AUT': 'J4', 'JOR_ARG': 'J5', 'ALG_AUT': 'J6',
  'POR_COD': 'K1', 'UZB_COL': 'K2', 'COD_COL': 'K3', 'POR_UZB': 'K4', 'COL_POR': 'K5', 'COD_UZB': 'K6',
  'ENG_CRO': 'L1', 'GHA_PAN': 'L2', 'ENG_GHA': 'L3', 'CRO_PAN': 'L4', 'ENG_PAN': 'L5', 'CRO_GHA': 'L6',
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
  const homeId = TEAM_MAP[f.teams?.home?.name]
  const awayId = TEAM_MAP[f.teams?.away?.name]

  if (!homeId || !awayId) {
    console.warn('Unknown team:', f.teams?.home?.name, f.teams?.away?.name)
    return
  }

  const hScore = f.goals?.home
  const aScore = f.goals?.away
  if (hScore === null || aScore === null) return

  const key       = `${homeId}_${awayId}`
  const fixtureId = FIXTURE_MAP[key]

  if (!fixtureId) {
    console.warn('No fixture ID found for:', key)
    return
  }

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

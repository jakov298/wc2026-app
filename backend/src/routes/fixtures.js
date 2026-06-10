import express from 'express'
import axios   from 'axios'

const router = express.Router()

const AF = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY },
})

const WC_LEAGUE = 1
const WC_SEASON = 2026

// Maps API team names → our internal IDs
const TEAM_MAP = {
  'Mexico': 'MEX', 'South Africa': 'RSA', 'South Korea': 'KOR',
  'Czech Republic': 'CZE', 'Czechia': 'CZE',
  'Canada': 'CAN', 'Bosnia & Herzegovina': 'BIH', 'Bosnia': 'BIH',
  'Qatar': 'QAT', 'Switzerland': 'SUI',
  'Brazil': 'BRA', 'Morocco': 'MAR', 'Haiti': 'HAI', 'Scotland': 'SCO',
  'United States': 'USA', 'Paraguay': 'PAR', 'Australia': 'AUS', 'Turkey': 'TUR',
  'Germany': 'GER', 'Curacao': 'CUW', 'Curaçao': 'CUW',
  'Ivory Coast': 'CIV', "Côte d'Ivoire": 'CIV', 'Cote d\'Ivoire': 'CIV',
  'Ecuador': 'ECU',
  'Netherlands': 'NED', 'Japan': 'JPN', 'Sweden': 'SWE', 'Tunisia': 'TUN',
  'Belgium': 'BEL', 'Egypt': 'EGY', 'Iran': 'IRN', 'New Zealand': 'NZL',
  'Spain': 'ESP', 'Cape Verde': 'CPV', 'Cabo Verde': 'CPV',
  'Saudi Arabia': 'KSA', 'Uruguay': 'URU',
  'France': 'FRA', 'Senegal': 'SEN', 'Iraq': 'IRQ', 'Norway': 'NOR',
  'Argentina': 'ARG', 'Algeria': 'ALG', 'Austria': 'AUT', 'Jordan': 'JOR',
  'Portugal': 'POR', 'DR Congo': 'COD', 'Congo DR': 'COD', 'Democratic Republic of Congo': 'COD',
  'Uzbekistan': 'UZB', 'Colombia': 'COL',
  'England': 'ENG', 'Croatia': 'CRO', 'Ghana': 'GHA', 'Panama': 'PAN',
}

// Which group each team belongs to
const TEAM_GROUP = {
  MEX:'A', RSA:'A', KOR:'A', CZE:'A',
  CAN:'B', BIH:'B', QAT:'B', SUI:'B',
  BRA:'C', MAR:'C', HAI:'C', SCO:'C',
  USA:'D', PAR:'D', AUS:'D', TUR:'D',
  GER:'E', CUW:'E', CIV:'E', ECU:'E',
  NED:'F', JPN:'F', SWE:'F', TUN:'F',
  BEL:'G', EGY:'G', IRN:'G', NZL:'G',
  ESP:'H', CPV:'H', KSA:'H', URU:'H',
  FRA:'I', SEN:'I', IRQ:'I', NOR:'I',
  ARG:'J', ALG:'J', AUT:'J', JOR:'J',
  POR:'K', COD:'K', UZB:'K', COL:'K',
  ENG:'L', CRO:'L', GHA:'L', PAN:'L',
}

// Custom fields not available from API — keyed by venue name
const VENUE_META = {
  'Estadio Azteca':         { roofed: false, altitude: 2240 },
  'Estadio Akron':          { roofed: false, altitude: 1566 },
  'Estadio BBVA':           { roofed: false, altitude: 537  },
  'NRG Stadium':            { roofed: true,  altitude: 35   },
  'AT&T Stadium':           { roofed: true,  altitude: 186  },
  'Mercedes-Benz Stadium':  { roofed: true,  altitude: 287  },
  'Hard Rock Stadium':      { roofed: false, altitude: 2    },
  'SoFi Stadium':           { roofed: true,  altitude: 89   },
  'Lumen Field':            { roofed: false, altitude: 4    },
  "Levi's Stadium":         { roofed: false, altitude: 18   },
  'MetLife Stadium':        { roofed: false, altitude: 2    },
  'Gillette Stadium':       { roofed: false, altitude: 24   },
  'Lincoln Financial Field':{ roofed: false, altitude: 11   },
  'Lincoln Financial':      { roofed: false, altitude: 11   },
  'Arrowhead Stadium':      { roofed: false, altitude: 290  },
  'BMO Field':              { roofed: false, altitude: 76   },
  'BC Place':               { roofed: true,  altitude: 5    },
  'Rose Bowl':              { roofed: false, altitude: 258  },
}

// City name overrides — API may return suburb names we don't use
const CITY_OVERRIDE = {
  'Pasadena':        'Los Angeles',
  'East Rutherford': 'New York',
  'Inglewood':       'Los Angeles',
  'Foxborough':      'Boston',
  'Glendale':        'Los Angeles',
}

router.get('/live', async (req, res) => {
  try {
    const { data } = await AF.get('/fixtures', {
      params: { live: 'all', league: WC_LEAGUE, season: WC_SEASON },
    })
    res.json(data.response || [])
  } catch (e) {
    console.error(e.message)
    res.status(502).json({ error: 'API-Football unavailable' })
  }
})

router.get('/today', async (req, res) => {
  const today = new Date().toISOString().split('T')[0]
  try {
    const { data } = await AF.get('/fixtures', {
      params: { date: today, league: WC_LEAGUE, season: WC_SEASON },
    })
    res.json(data.response || [])
  } catch (e) {
    console.error(e.message)
    res.status(502).json({ error: 'API-Football unavailable' })
  }
})

router.get('/results', async (req, res) => {
  try {
    const { data } = await AF.get('/fixtures', {
      params: { league: WC_LEAGUE, season: WC_SEASON, status: 'FT' },
    })
    res.json(data.response || [])
  } catch (e) {
    res.status(502).json({ error: 'API-Football unavailable' })
  }
})

// GET /api/fixtures/generate — builds the full FIXTURES array from live API data
router.get('/generate', async (req, res) => {
  try {
    const { data } = await AF.get('/fixtures', {
      params: { league: WC_LEAGUE, season: WC_SEASON, from: '2026-06-11', to: '2026-06-28' },
    })

    const raw = (data.response || []).filter(f =>
      f.league.round?.startsWith('Group Stage')
    )

    const unmapped = []
    const byGroup = {}

    for (const f of raw) {
      const homeName = f.teams.home.name
      const awayName = f.teams.away.name
      const homeId   = TEAM_MAP[homeName]
      const awayId   = TEAM_MAP[awayName]

      if (!homeId) unmapped.push(homeName)
      if (!awayId) unmapped.push(awayName)
      if (!homeId || !awayId) continue

      const group = TEAM_GROUP[homeId]
      if (!group) continue

      if (!byGroup[group]) byGroup[group] = []

      const venueName = f.fixture.venue?.name || ''
      const apiCity   = f.fixture.venue?.city || ''
      const city      = CITY_OVERRIDE[apiCity] || apiCity
      const meta      = VENUE_META[venueName] || { roofed: false, altitude: 0 }

      // Convert UTC date to local venue time (approximate — UTC offset by city)
      const utcDate  = new Date(f.fixture.date)
      const localStr = utcDate.toISOString()

      byGroup[group].push({
        apiId:    f.fixture.id,
        group,
        home:     homeId,
        away:     awayId,
        venue:    venueName,
        city,
        date:     localStr.split('T')[0],
        timeUTC:  localStr.split('T')[1].slice(0,5),
        roofed:   meta.roofed,
        altitude: meta.altitude,
        _ts:      f.fixture.timestamp,
      })
    }

    // Sort within each group by timestamp, assign IDs (A1-A6, B1-B6, ...)
    const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']
    const fixtures = []
    for (const g of GROUPS) {
      const gFixtures = (byGroup[g] || []).sort((a, b) => a._ts - b._ts)
      gFixtures.forEach((f, i) => {
        const { _ts, timeUTC, ...rest } = f
        fixtures.push({ id: `${g}${i+1}`, ...rest, timeUTC })
      })
    }

    res.json({
      total: fixtures.length,
      unmappedTeams: [...new Set(unmapped)],
      fixtures,
    })
  } catch (e) {
    console.error(e)
    res.status(502).json({ error: e.message })
  }
})

export default router

import { TEAMS, CONDITIONS, FIXTURES, VENUE_COORDS, VENUE_HEAT, VENUE_PITCH, TEAM_HOME_CITY } from './data.js'

function distanceKm(c1, c2) {
  const R = 6371
  const dLat = (c2.lat - c1.lat) * Math.PI / 180
  const dLon = (c2.lon - c1.lon) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 +
            Math.cos(c1.lat * Math.PI/180) * Math.cos(c2.lat * Math.PI/180) *
            Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// Total travel km: homeCity → game1City → game2City → game3City, scaled 1-100
// Min km = 100 (best), max km = 1 (worst). Computed once from the fixture schedule.
function buildTravelScores() {
  const rawKm = {}

  TEAMS.forEach(team => {
    const homeCity = TEAM_HOME_CITY[team.id]
    const homeCoord = VENUE_COORDS[homeCity]
    if (!homeCoord) { rawKm[team.id] = null; return }

    const fixtures = FIXTURES
      .filter(f => f.home === team.id || f.away === team.id)
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    if (fixtures.length < 3) { rawKm[team.id] = null; return }

    const c1 = VENUE_COORDS[fixtures[0].city]
    const c2 = VENUE_COORDS[fixtures[1].city]
    const c3 = VENUE_COORDS[fixtures[2].city]
    if (!c1 || !c2 || !c3) { rawKm[team.id] = null; return }

    rawKm[team.id] = Math.round(
      distanceKm(homeCoord, c1) + distanceKm(c1, c2) + distanceKm(c2, c3)
    )
  })

  const validKm = Object.values(rawKm).filter(v => v !== null)
  const minKm   = Math.min(...validKm)
  const maxKm   = Math.max(...validKm)
  const range   = maxKm - minKm || 1

  const scores = {}
  TEAMS.forEach(team => {
    const km = rawKm[team.id]
    scores[team.id] = km !== null
      ? Math.round(1 + ((maxKm - km) / range) * 99)
      : team.travel
  })
  return scores
}

const TRAVEL_SCORES = buildTravelScores()

export function buildStandings(results) {
  const standings = {}
  TEAMS.forEach(t => {
    standings[t.id] = {
      teamId: t.id, played: 0, won: 0, drawn: 0, lost: 0,
      gf: 0, ga: 0, gd: 0, points: 0, form: [],
    }
  })
  results.forEach(r => {
    if (r.home_score === null || r.away_score === null) return
    const h = standings[r.home_team]
    const a = standings[r.away_team]
    if (!h || !a) return
    h.played++; a.played++
    h.gf += r.home_score; h.ga += r.away_score
    a.gf += r.away_score; a.ga += r.home_score
    h.gd = h.gf - h.ga; a.gd = a.gf - a.ga
    if (r.home_score > r.away_score) {
      h.won++; h.points += 3; h.form.push('W')
      a.lost++;               a.form.push('L')
    } else if (r.home_score < r.away_score) {
      a.won++; a.points += 3; a.form.push('W')
      h.lost++;               h.form.push('L')
    } else {
      h.drawn++; h.points += 1; h.form.push('D')
      a.drawn++; a.points += 1; a.form.push('D')
    }
  })
  return standings
}

function computeDynamicScores(results) {
  const teamGames = {}
  TEAMS.forEach(t => { teamGames[t.id] = [] })

  results.forEach(r => {
    if (r.home_score === null || r.away_score === null) return
    const fixture = FIXTURES.find(f => f.id === r.fixture_id)
    if (!fixture) return
    if (teamGames[r.home_team]) teamGames[r.home_team].push({ fixture, role: 'home', result: r })
    if (teamGames[r.away_team]) teamGames[r.away_team].push({ fixture, role: 'away', result: r })
  })

  const standings  = buildStandings(results)
  const rawScores  = {}

  TEAMS.forEach(team => {
    const games    = teamGames[team.id]
    const fifaScore = Math.round(100 - ((Math.min(Math.max(team.fifaRank, 1), 96) - 1) / 95) * 99)

    if (games.length === 0) {
      rawScores[team.id] = {
        heat:     team.heat,
        pitch:    team.pitch,
        altitude: team.altitude,
        travel:   TRAVEL_SCORES[team.id],
        crowd:    team.crowd,
        schedule: team.schedule,
        form:     fifaScore,
      }
      return
    }

    const heatVals = [], pitchVals = [], altVals = [], crowdVals = [], schedVals = []
    const sorted = [...games].sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date))

    sorted.forEach((g, i) => {
      const f = g.fixture
      heatVals.push(f.roofed ? 50 : (VENUE_HEAT[f.city] ?? 60))
      pitchVals.push(VENUE_PITCH[f.venue] ?? 70)
      altVals.push(f.altitude > 1500
        ? Math.min(100, team.altitude + 15)
        : Math.max(1, team.altitude - 5))

      const isNearHost =
        (team.id === 'MEX' && ['Mexico City','Guadalajara','Monterrey'].includes(f.city)) ||
        (team.id === 'USA' && !['Mexico City','Guadalajara','Monterrey','Toronto','Vancouver'].includes(f.city)) ||
        (team.id === 'CAN' && ['Toronto','Vancouver'].includes(f.city))
      crowdVals.push(isNearHost
        ? Math.min(100, team.crowd + 20)
        : ['MEX','USA','CAN'].includes(team.id)
          ? Math.min(100, team.crowd + 8)
          : team.crowd)

      if (i === 0) {
        schedVals.push(team.schedule)
      } else {
        const daysRest = Math.round(
          (new Date(f.date) - new Date(sorted[i-1].fixture.date)) / 86400000
        )
        schedVals.push(Math.min(100, Math.max(1, Math.round(daysRest / 7 * 100))))
      }
    })

    const avg   = arr => Math.round(arr.reduce((s, v) => s + v, 0) / arr.length)
    const blend = (base, dyn) => Math.round(base * 0.4 + dyn * 0.6)

    const s = standings[team.id]
    let formScore = fifaScore
    if (s.form.length > 0) {
      const map   = { W: 100, D: 50, L: 0 }
      const slice = s.form.slice(-3)
      const num   = slice.reduce((acc, r, i) => acc + (map[r] ?? 50) * (i + 1), 0)
      const den   = slice.reduce((acc, _, i) => acc + (i + 1), 0)
      const w     = Math.min(s.played / 3, 1)
      formScore   = Math.round(fifaScore * (1 - w) + Math.round(num / den) * w)
    }

    rawScores[team.id] = {
      heat:     blend(team.heat,     avg(heatVals)),
      pitch:    blend(team.pitch,    avg(pitchVals)),
      altitude: blend(team.altitude, avg(altVals)),
      travel:   TRAVEL_SCORES[team.id],   // fixed from schedule — total km home→g1→g2→g3
      crowd:    blend(team.crowd,    avg(crowdVals)),
      schedule: blend(team.schedule, avg(schedVals)),
      form:     formScore,
    }
  })

  // Scale each attribute 1-100 across all 48 teams
  const ALL_KEYS = ['heat','pitch','altitude','travel','crowd','schedule','form']
  const scaled = {}
  TEAMS.forEach(t => { scaled[t.id] = {} })

  ALL_KEYS.forEach(key => {
    const vals  = TEAMS.map(t => rawScores[t.id]?.[key] ?? 50)
    const min   = Math.min(...vals)
    const max   = Math.max(...vals)
    const range = max - min || 1
    TEAMS.forEach((t, i) => {
      scaled[t.id][key] = Math.round(1 + ((vals[i] - min) / range) * 99)
    })
  })

  return scaled
}

export function getConditionScore(teamId, dynamicScores, condWeights = null) {
  const scores = dynamicScores[teamId]
  if (!scores) return 50
  const keys   = [...CONDITIONS.map(c => c.key), 'form']
  const w      = condWeights || Object.fromEntries(keys.map(k => [k, 1]))
  const totalW = keys.reduce((s, k) => s + (w[k] || 0), 0)
  if (totalW === 0) return 50
  return Math.round(keys.reduce((s, k) => s + (scores[k] || 50) * (w[k] || 0), 0) / totalW)
}

export function computePowerRankings(results, condWeights = null) {
  const standings     = buildStandings(results)
  const dynamicScores = computeDynamicScores(results)

  const rawScores = TEAMS.map(team => {
    const cs = getConditionScore(team.id, dynamicScores, condWeights)
    const s  = standings[team.id]
    return { ...team, ...s, dynamicScores: dynamicScores[team.id], conditionScore: cs, _raw: cs }
  })

  const vals  = rawScores.map(r => r._raw)
  const minV  = Math.min(...vals)
  const maxV  = Math.max(...vals)
  const range = maxV - minV || 1

  return rawScores
    .map(r => ({ ...r, powerScore: Math.round(1 + ((r._raw - minV) / range) * 99) }))
    .sort((a, b) => b.powerScore - a.powerScore)
}

export function predictMatch(homeId, awayId, fixture, results, condWeights = null) {
  const rankings = computePowerRankings(results, condWeights)
  const home     = rankings.find(r => r.id === homeId)
  const away     = rankings.find(r => r.id === awayId)
  if (!home || !away) return null

  const homeTeam = TEAMS.find(t => t.id === homeId)
  const awayTeam = TEAMS.find(t => t.id === awayId)

  let homeAdj = 0, awayAdj = 0
  if (fixture) {
    if (fixture.altitude > 1500) {
      homeAdj += (homeTeam.altitude - 50) * 0.08
      awayAdj += (awayTeam.altitude - 50) * 0.08
    }
    if (!fixture.roofed) {
      const vh = VENUE_HEAT[fixture.city] ?? 60
      homeAdj += (homeTeam.heat - vh) * 0.04
      awayAdj += (awayTeam.heat - vh) * 0.04
    }
    if (['MEX','USA','CAN'].includes(homeId)) homeAdj += 6
  }

  const hStr  = home.powerScore + homeAdj
  const aStr  = away.powerScore + awayAdj
  const total = hStr + aStr
  const homeWin = Math.round((hStr / total) * 70 + 10)
  const awayWin = Math.round((aStr / total) * 70 + 10)
  const draw    = Math.round(100 - homeWin - awayWin)

  return {
    homeWin:  Math.max(5,  Math.min(85, homeWin)),
    draw:     Math.max(10, Math.min(40, draw)),
    awayWin:  Math.max(5,  Math.min(85, awayWin)),
    homePower: Math.round(hStr), awayPower: Math.round(aStr),
    homeCondScore: home.conditionScore, awayCondScore: away.conditionScore,
    keyFactors: getKeyFactors(homeTeam, awayTeam, fixture),
  }
}

function getKeyFactors(home, away, fixture) {
  const factors = []
  if (!fixture) return factors
  if (fixture.altitude > 1500) {
    const better = home.altitude > away.altitude ? home.name : away.name
    factors.push(`${better} has the altitude edge at ${fixture.city} (${fixture.altitude}m)`)
  }
  if (!fixture.roofed) {
    const vh = VENUE_HEAT[fixture.city] ?? 60
    if (home.heat > vh + 20 && away.heat < vh - 20)
      factors.push(`${home.name} far more suited to outdoor heat in ${fixture.city}`)
    if (away.heat > vh + 20 && home.heat < vh - 20)
      factors.push(`${away.name} far more suited to outdoor heat in ${fixture.city}`)
  }
  if (fixture.roofed)
    factors.push(`Covered roof at ${fixture.city} neutralises heat and humidity`)
  if (['MEX','USA','CAN'].includes(home.id))
    factors.push(`${home.name} playing on home soil - crowd and travel advantage`)
  return factors
}

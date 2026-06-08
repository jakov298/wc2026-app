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

  const standings = buildStandings(results)
  const scores = {}

  TEAMS.forEach(team => {
    const games = teamGames[team.id]
    const baseline = {
      heat: team.heat, pitch: team.pitch, altitude: team.altitude,
      travel: team.travel, crowd: team.crowd, schedule: team.schedule,
    }
    const fifaScore = Math.round(100 - ((Math.min(Math.max(team.fifaRank, 1), 96) - 1) / 95) * 99)

    if (games.length === 0) {
      scores[team.id] = { ...baseline, form: fifaScore }
      return
    }

    const heatVals = [], pitchVals = [], altitudeVals = []
    const travelVals = [], crowdVals = [], scheduleVals = []
    const sortedGames = [...games].sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date))

    sortedGames.forEach((g, i) => {
      const f = g.fixture

      // HEAT — actual venue heat, neutralised for roofed stadiums
      heatVals.push(f.roofed ? 50 : (VENUE_HEAT[f.city] ?? 60))

      // PITCH — actual stadium surface quality
      pitchVals.push(VENUE_PITCH[f.venue] ?? 70)

      // ALTITUDE — how well this team handles this venue's altitude
      altitudeVals.push(f.altitude > 1500
        ? Math.min(100, team.altitude + 15)
        : Math.max(1,   team.altitude - 5))

      // TRAVEL — distance from home (first game) or last venue (subsequent games)
      if (i === 0) {
        const homeCity = TEAM_HOME_CITY[team.id]
        const homeCoord = VENUE_COORDS[homeCity]
        const venueCoord = VENUE_COORDS[f.city]
        if (homeCoord && venueCoord) {
          const km = distanceKm(homeCoord, venueCoord)
          travelVals.push(Math.max(1, Math.round(100 - (km / 15000) * 99)))
        } else {
          travelVals.push(team.travel)
        }
      } else {
        const prevCoord = VENUE_COORDS[sortedGames[i-1].fixture.city]
        const currCoord = VENUE_COORDS[f.city]
        if (prevCoord && currCoord) {
          const km = distanceKm(prevCoord, currCoord)
          travelVals.push(Math.max(1, Math.round(100 - (km / 5000) * 99)))
        } else {
          travelVals.push(team.travel)
        }
      }

      // CROWD — home nations boosted at home venues
      const isNearHost =
        (team.id === 'MEX' && ['Mexico City','Guadalajara','Monterrey'].includes(f.city)) ||
        (team.id === 'USA' && !['Mexico City','Guadalajara','Monterrey','Toronto','Vancouver'].includes(f.city)) ||
        (team.id === 'CAN' && ['Toronto','Vancouver'].includes(f.city))
      crowdVals.push(isNearHost
        ? Math.min(100, team.crowd + 20)
        : ['MEX','USA','CAN'].includes(team.id)
          ? Math.min(100, team.crowd + 8)
          : team.crowd)

      // SCHEDULE — days rest since last game
      if (i === 0) {
        scheduleVals.push(team.schedule)
      } else {
        const daysRest = Math.round(
          (new Date(f.date) - new Date(sortedGames[i-1].fixture.date)) / 86400000
        )
        scheduleVals.push(Math.min(100, Math.max(1, Math.round(daysRest / 7 * 100))))
      }
    })

    const avg   = arr => Math.round(arr.reduce((s, v) => s + v, 0) / arr.length)
    const blend = (base, dyn) => Math.round(base * 0.4 + dyn * 0.6)

    // FORM — FIFA rank blended progressively with actual in-tournament results
    const s = standings[team.id]
    let formScore = fifaScore
    if (s.form.length > 0) {
      const map = { W: 100, D: 50, L: 0 }
      const slice = s.form.slice(-3)
      const num = slice.reduce((acc, r, i) => acc + (map[r] ?? 50) * (i + 1), 0)
      const den = slice.reduce((acc, _, i) => acc + (i + 1), 0)
      const w = Math.min(s.played / 3, 1)
      formScore = Math.round(fifaScore * (1 - w) + Math.round(num / den) * w)
    }

    scores[team.id] = {
      heat:     blend(baseline.heat,     avg(heatVals)),
      pitch:    blend(baseline.pitch,    avg(pitchVals)),
      altitude: blend(baseline.altitude, avg(altitudeVals)),
      travel:   blend(baseline.travel,   avg(travelVals)),
      crowd:    blend(baseline.crowd,    avg(crowdVals)),
      schedule: blend(baseline.schedule, avg(scheduleVals)),
      form:     formScore,
    }
  })

  return scores
}

export function getConditionScore(teamId, dynamicScores, condWeights = null) {
  const scores = dynamicScores[teamId]
  if (!scores) return 50
  const keys = [...CONDITIONS.map(c => c.key), 'form']
  const w = condWeights || Object.fromEntries(keys.map(k => [k, 1]))
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
    factors.push(`Covered roof at ${fixture.city} neutralises heat & humidity`)
  if (['MEX','USA','CAN'].includes(home.id))
    factors.push(`${home.name} playing on home soil — crowd and travel advantage`)
  return factors
}    standings[t.id] = {
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
      a.lost++;                 a.form.push('L')
    } else if (r.home_score < r.away_score) {
      a.won++; a.points += 3; a.form.push('W')
      h.lost++;                 h.form.push('L')
    } else {
      h.drawn++; h.points += 1; h.form.push('D')
      a.drawn++; a.points += 1; a.form.push('D')
    }
  })

  return standings
}

/**
 * Compute full power rankings combining standings + condition scores
 */
export function computePowerRankings(results, condWeights = null) {
  const standings = buildStandings(results)

  // Find max values for normalisation
  const allPoints = Object.values(standings).map(s => s.points)
  const maxPoints = Math.max(...allPoints, 1)
  const allGD     = Object.values(standings).map(s => s.gd)
  const maxGD     = Math.max(...allGD.map(Math.abs), 1)
  const allGF     = Object.values(standings).map(s => s.gf)
  const maxGF     = Math.max(...allGF, 1)

  const rankings = TEAMS.map(team => {
    const s   = standings[team.id]
    const cs  = getConditionScore(team.id, condWeights)

    // Normalise standing metrics to 0-100
    const pointsNorm = (s.points / maxPoints) * 100
    const gdNorm     = ((s.gd + maxGD) / (2 * maxGD)) * 100
    const gfNorm     = (s.gf / maxGF) * 100

    // Form score: recent 3 games, W=100 D=50 L=0, decay-weighted
    const formSlice = s.form.slice(-3)
    const formMap   = { W: 100, D: 50, L: 0 }
    const formScore = formSlice.length === 0
      ? 50  // no games yet → neutral
      : formSlice.reduce((acc, r, i) => acc + (formMap[r] || 50) * (i + 1), 0)
        / formSlice.reduce((acc, _, i) => acc + (i + 1), 0)

    // Momentum: bonus for winning streak, penalty for losing streak
    const streak = getStreak(s.form)
    const momentumScore = Math.min(100, Math.max(0, 50 + streak * 12))

    // Strength of schedule placeholder (will fill when we have more results)
    const sosScore = 50

    // Weighted composite
    const power = Math.round(
      pointsNorm  * WEIGHTS.points +
      gdNorm      * WEIGHTS.goalDiff +
      gfNorm      * WEIGHTS.goalsFor +
      cs          * WEIGHTS.conditionScore +
      formScore   * WEIGHTS.formMultiplier +
      sosScore    * WEIGHTS.strengthOfSched +
      momentumScore * WEIGHTS.momentum
    )

    return {
      ...team,
      ...s,
      conditionScore: cs,
      formScore: Math.round(formScore),
      momentumScore: Math.round(momentumScore),
      powerScore: Math.min(99, Math.max(1, power)),
      formSlice,
    }
  })

  return rankings.sort((a, b) => b.powerScore - a.powerScore)
}

function getStreak(form) {
  if (!form.length) return 0
  const last = form[form.length - 1]
  let streak = 0
  for (let i = form.length - 1; i >= 0; i--) {
    if (form[i] === last) streak++
    else break
  }
  return last === 'W' ? streak : last === 'L' ? -streak : 0
}

/**
 * Predict match outcome based on power scores + conditions + venue
 */
export function predictMatch(homeId, awayId, fixture, results, condWeights = null) {
  const rankings = computePowerRankings(results, condWeights)
  const home     = rankings.find(r => r.id === homeId)
  const away     = rankings.find(r => r.id === awayId)
  if (!home || !away) return null

  const homeTeam = TEAMS.find(t => t.id === homeId)
  const awayTeam = TEAMS.find(t => t.id === awayId)

  // Venue-specific condition adjustments
  let homeAdj = 0, awayAdj = 0
  if (fixture) {
    if (fixture.altitude > 1500) {
      homeAdj += (homeTeam.altitude - 50) * 0.08
      awayAdj += (awayTeam.altitude - 50) * 0.08
    }
    if (!fixture.roofed) {
      homeAdj += (homeTeam.heat - 50) * 0.06
      awayAdj += (awayTeam.heat - 50) * 0.06
    }
    // Home host bonus
    const hosts = ['MEX', 'USA', 'CAN']
    if (hosts.includes(homeId)) homeAdj += 8
  }

  const homeStrength = home.powerScore + homeAdj
  const awayStrength = away.powerScore + awayAdj
  const total        = homeStrength + awayStrength

  const homeWin  = Math.round((homeStrength / total) * 70 + 10)
  const awayWin  = Math.round((awayStrength / total) * 70 + 10)
  const draw     = Math.round(100 - homeWin - awayWin)

  return {
    homeWin:  Math.max(5,  Math.min(85, homeWin)),
    draw:     Math.max(10, Math.min(40, draw)),
    awayWin:  Math.max(5,  Math.min(85, awayWin)),
    homePower:  Math.round(homeStrength),
    awayPower:  Math.round(awayStrength),
    homeCondScore: home.conditionScore,
    awayCondScore: away.conditionScore,
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
  if (!fixture.roofed && home.heat > 75 && away.heat < 60) {
    factors.push(`${home.name} thrives in outdoor heat — ${away.name} historically struggles`)
  }
  if (!fixture.roofed && away.heat > 75 && home.heat < 60) {
    factors.push(`${away.name} is far better equipped for the outdoor heat than ${home.name}`)
  }
  if (fixture.roofed) {
    factors.push(`Covered roof at ${fixture.city} neutralises heat/humidity advantage`)
  }
  const hosts = ['MEX', 'USA', 'CAN']
  if (hosts.includes(home.id)) {
    factors.push(`${home.name} playing on home soil — crowd and travel advantage`)
  }
  return factors
}

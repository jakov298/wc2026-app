import { TEAMS, CONDITIONS } from './data.js'

// Weights for different ranking factors
const WEIGHTS = {
  points:          0.30,  // W/D/L points
  goalDiff:        0.12,  // goal difference
  goalsFor:        0.06,  // attacking output
  conditionScore:  0.20,  // our 6-condition adaptability rating
  formMultiplier:  0.18,  // recent form (last 3 games weighted)
  strengthOfSched: 0.08,  // quality of opponents beaten
  momentum:        0.06,  // winning streak / collapse indicator
}

/**
 * Compute a team's condition adaptability score (1-100)
 * using provided weights (default: equal)
 */
export function getConditionScore(teamId, condWeights = null) {
  const team = TEAMS.find(t => t.id === teamId)
  if (!team) return 50
  const keys = CONDITIONS.map(c => c.key)
  const w = condWeights || Object.fromEntries(keys.map(k => [k, 1]))
  const totalW = keys.reduce((s, k) => s + (w[k] || 0), 0)
  if (totalW === 0) return 50
  const raw = keys.reduce((s, k) => s + team[k] * (w[k] || 0), 0) / totalW
  return Math.round(raw)
}

/**
 * Build group standings from results array
 * results: [{ fixture_id, home_team, away_team, home_score, away_score }]
 */
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

import express from 'express'
import axios   from 'axios'

const router = express.Router()

const AF = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY },
})

const WC_LEAGUE   = 1
const WC_SEASON   = 2026

// GET /api/fixtures/live
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

// GET /api/fixtures/today
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

// GET /api/fixtures/results  — all finished WC fixtures
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

// TEMP — check what fixture fields the API returns
router.get('/test-fields', async (req, res) => {
  try {
    const { data } = await AF.get('/fixtures', {
      params: { league: WC_LEAGUE, season: WC_SEASON, from: '2026-06-11', to: '2026-06-13' },
    })
    res.json((data.response || []).slice(0, 3))
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
})

export default router

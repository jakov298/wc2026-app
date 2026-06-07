import 'dotenv/config'
import express    from 'express'
import cors       from 'cors'
import cron       from 'node-cron'

import fixtureRoutes  from './routes/fixtures.js'
import analysisRoutes from './routes/analysis.js'
import { pollLiveScores, syncTodayResults } from './jobs/scorePoll.js'

const app  = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }))
app.use(express.json())

// Routes
app.use('/api/fixtures', fixtureRoutes)
app.use('/api/analysis', analysisRoutes)

app.get('/api/health', (_, res) => res.json({ ok: true, ts: new Date() }))

// ── Cron jobs ────────────────────────────────────────────────────────────────
// Poll live scores every 60 seconds
cron.schedule('* * * * *', async () => {
  try { await pollLiveScores() } catch (e) { console.error('pollLiveScores:', e.message) }
})

// Sync today's finished results every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try { await syncTodayResults() } catch (e) { console.error('syncTodayResults:', e.message) }
})

app.listen(PORT, () => console.log(`WC2026 backend running on :${PORT}`))

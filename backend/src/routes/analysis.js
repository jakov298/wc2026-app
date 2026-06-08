import express   from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const router   = express.Router()
const claude   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

router.post('/:fixtureId', async (req, res) => {
  const { fixtureId } = req.params
  const { home, away, homeRank, awayRank, fixture, prediction, existingResult } = req.body

  const isPlayed = existingResult && existingResult.home_score !== null
  const today    = new Date().toISOString().split('T')[0]

  try {
    const { data: cached } = await supabase
      .from('analyses')
      .select('*')
      .eq('fixture_id', fixtureId)
      .single()

    if (cached && cached.content) {
      const cacheDate      = cached.updated_at?.split('T')[0]
      const cacheHadResult = cached.has_result
      if (isPlayed && cacheHadResult)       return res.json({ analysis: cached.content, cached: true })
      if (!isPlayed && cacheDate === today) return res.json({ analysis: cached.content, cached: true })
    }
  } catch {}

  const resultLine = isPlayed
    ? `Final score: ${home.name} ${existingResult.home_score}-${existingResult.away_score} ${away.name}`
    : `Not yet played. Model: ${home.name} ${prediction?.homeWin}% / Draw ${prediction?.draw}% / ${away.name} ${prediction?.awayWin}%`

  const formHome = homeRank?.form?.slice(-3).join(', ') || 'No games yet'
  const formAway = awayRank?.form?.slice(-3).join(', ') || 'No games yet'

  const prompt = `You are a world-class football analyst covering the 2026 FIFA World Cup. Write ONE concise paragraph of exactly 200 words or less.

MATCH: ${home.flag} ${home.name} (FIFA #${home.fifaRank}, Power ${homeRank?.powerScore ?? 'N/A'}/100) vs ${away.flag} ${away.name} (FIFA #${away.fifaRank}, Power ${awayRank?.powerScore ?? 'N/A'}/100)
Group ${fixture.group} · ${fixture.venue}, ${fixture.city} · ${fixture.date}
Status: ${isPlayed ? 'COMPLETED' : 'UPCOMING'} · ${resultLine}
Venue: Altitude ${fixture.altitude}m${fixture.altitude > 1500 ? ' (HIGH)' : ''} · ${fixture.roofed ? 'Covered roof' : 'Open air'}

${home.name.toUpperCase()}: FIFA #${home.fifaRank} · Power ${homeRank?.powerScore ?? 'N/A'} · Heat ${home.heat} · Altitude ${home.altitude} · Form: ${formHome} · ${homeRank?.points ?? 0}pts
${away.name.toUpperCase()}: FIFA #${away.fifaRank} · Power ${awayRank?.powerScore ?? 'N/A'} · Heat ${away.heat} · Altitude ${away.altitude} · Form: ${formAway} · ${awayRank?.points ?? 0}pts

${prediction?.keyFactors?.length ? prediction.keyFactors.join(' · ') : ''}

Write ONE paragraph covering: tactical matchup, venue conditions impact, key players, ${isPlayed ? 'what the result means for group qualification.' : 'predicted scoreline and best value bet (end with: "Not betting advice. Gamble responsibly.")'}

Under 200 words. Be specific. Name real players. Reference the data.`

  try {
    const msg = await claude.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 400,
      messages:   [{ role: 'user', content: prompt }],
    })

    const analysis = msg.content[0].text

    try {
      await supabase.from('analyses').upsert({
        fixture_id: fixtureId,
        content:    analysis,
        has_result: isPlayed,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'fixture_id' })
    } catch {}

    res.json({ analysis, cached: false })
  } catch (e) {
    console.error('Claude API error:', e.message)
    res.status(500).json({ error: 'Analysis generation failed' })
  }
})

export default router

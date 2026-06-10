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

  // Smart cache — same analysis for all users
  try {
    const { data: cached } = await supabase
      .from('analyses')
      .select('*')
      .eq('fixture_id', fixtureId)
      .single()
    if (cached?.content) {
      const cacheDate = cached.updated_at?.split('T')[0]
      if (isPlayed && cached.has_result) return res.json({ analysis: cached.content, cached: true })
      if (!isPlayed && cacheDate === today) return res.json({ analysis: cached.content, cached: true })
    }
  } catch {}

  const resultLine = isPlayed
    ? `Final score: ${home.name} ${existingResult.home_score}-${existingResult.away_score} ${away.name}`
    : `Not yet played. Model: ${home.name} ${prediction?.homeWin}% / Draw ${prediction?.draw}% / ${away.name} ${prediction?.awayWin}%`

  const formHome = homeRank?.form?.slice(-3).join(', ') || 'No games yet'
  const formAway = awayRank?.form?.slice(-3).join(', ') || 'No games yet'

  const hd = homeRank?.dynamicScores || {}
  const ad = awayRank?.dynamicScores || {}

  const prompt = `You are a world-class football analyst covering the 2026 FIFA World Cup. Write ONE analytical paragraph of 180-200 words.

MATCH: ${home.flag} ${home.name} vs ${away.flag} ${away.name}
Group ${fixture.group} · ${fixture.venue}, ${fixture.city} · ${fixture.date}
Status: ${isPlayed ? 'COMPLETED' : 'UPCOMING'} · ${resultLine}
Roof: ${fixture.roofed ? 'COVERED (heat neutralised)' : 'OPEN AIR'} · Altitude: ${fixture.altitude}m${fixture.altitude > 1500 ? ' (HIGH — major impact)' : ''}

VENUE-SPECIFIC CONDITION SCORES FOR THIS FIXTURE (1-100, scaled across all 48 teams):
                    ${home.name.padEnd(20)} ${away.name}
Heat & humidity:    ${String(hd.heat ?? home.heat).padEnd(20)} ${ad.heat ?? away.heat}${fixture.roofed ? ' [NEUTRALISED BY ROOF]' : ''}
Pitch quality:      ${String(hd.pitch ?? home.pitch).padEnd(20)} ${ad.pitch ?? away.pitch}
Altitude adapt:     ${String(hd.altitude ?? home.altitude).padEnd(20)} ${ad.altitude ?? away.altitude}
Travel/jet lag:     ${String(hd.travel ?? home.travel).padEnd(20)} ${ad.travel ?? away.travel}
Crowd pressure:     ${String(hd.crowd ?? home.crowd).padEnd(20)} ${ad.crowd ?? away.crowd}
Schedule/fatigue:   ${String(hd.schedule ?? home.schedule).padEnd(20)} ${ad.schedule ?? away.schedule}
Form:               ${String(hd.form ?? 50).padEnd(20)} ${ad.form ?? 50}
Overall power:      ${String(homeRank?.powerScore ?? 'N/A').padEnd(20)} ${awayRank?.powerScore ?? 'N/A'}

FIFA ranks: ${home.name} #${home.fifaRank} · ${away.name} #${away.fifaRank}
Tournament form: ${home.name} [${formHome}] · ${away.name} [${formAway}]
${prediction?.keyFactors?.length ? 'Key edges: ' + prediction.keyFactors.join(' | ') : ''}

Write ONE paragraph (180-200 words) that:
1. Compares the condition scores to explain which team has the structural advantages for this specific fixture — reference the actual numbers
2. Explains why each significant gap matters tactically (heat acclimatisation, altitude impact, travel fatigue, crowd support, schedule pressure)
3. ${isPlayed ? 'Explains what the result means tactically and for group qualification' : 'Gives a specific scoreline prediction and identifies the best value bet (e.g. Asian handicap, both teams to score, total goals). End the bet suggestion with: "Not betting advice. Gamble responsibly."'}

Be specific. Reference the actual scores. Write like The Athletic.`

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
    res.status(500).json({ error: e.message || 'Analysis generation failed' })
  }
})

export default router

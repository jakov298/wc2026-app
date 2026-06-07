import express    from 'express'
import Anthropic   from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const router   = express.Router()
const claude   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// POST /api/analysis/:fixtureId
router.post('/:fixtureId', async (req, res) => {
  const { fixtureId } = req.params
  const { home, away, homeRank, awayRank, fixture, prediction, existingResult } = req.body

  // Return cached if available and result unchanged
  const { data: cached } = await supabase
    .from('analyses')
    .select('*')
    .eq('fixture_id', fixtureId)
    .single()

  if (cached && (!existingResult || cached.has_result)) {
    return res.json({ analysis: cached.content, cached: true })
  }

  // Build rich context prompt
  const isPlayed   = existingResult && existingResult.home_score !== null
  const resultLine = isPlayed
    ? `Final score: ${home.name} ${existingResult.home_score}–${existingResult.away_score} ${away.name}`
    : `Match not yet played. Predicted: ${home.name} ${prediction?.homeWin}% · Draw ${prediction?.draw}% · ${away.name} ${prediction?.awayWin}%`

  const formHome = homeRank?.form?.slice(-3).join(', ') || 'No games'
  const formAway = awayRank?.form?.slice(-3).join(', ') || 'No games'

  const prompt = `You are a world-class football analyst covering the 2026 FIFA World Cup. Write a sharp, insightful 3–4 paragraph match analysis.

MATCH: ${home.flag} ${home.name} vs ${away.flag} ${away.name}
Group ${fixture.group} · ${fixture.venue}, ${fixture.city}
Date: ${fixture.date} · ${isPlayed ? 'COMPLETED' : 'UPCOMING'}
${resultLine}

VENUE CONDITIONS:
- Altitude: ${fixture.altitude}m ${fixture.altitude > 1500 ? '(HIGH — significant stamina impact)' : '(normal)'}
- Roof: ${fixture.roofed ? 'Covered (heat/humidity neutralised)' : 'Open air'}

${home.name.toUpperCase()} PROFILE (Power ${homeRank?.powerScore ?? 'N/A'}):
- Condition adaptability: Heat ${home.heat} · Pitch ${home.pitch} · Altitude ${home.altitude} · Travel ${home.travel} · Crowd ${home.crowd} · Schedule ${home.schedule}
- Tournament form: ${formHome}
- Standing: ${homeRank?.played ?? 0} games, ${homeRank?.points ?? 0} pts, GD ${homeRank?.gd ?? 0}
- Context: ${home.insight}

${away.name.toUpperCase()} PROFILE (Power ${awayRank?.powerScore ?? 'N/A'}):
- Condition adaptability: Heat ${away.heat} · Pitch ${away.pitch} · Altitude ${away.altitude} · Travel ${away.travel} · Crowd ${away.crowd} · Schedule ${away.schedule}
- Tournament form: ${formAway}
- Standing: ${awayRank?.played ?? 0} games, ${awayRank?.points ?? 0} pts, GD ${awayRank?.gd ?? 0}
- Context: ${away.insight}

${prediction?.keyFactors?.length ? 'KEY CONDITION FACTORS:\n' + prediction.keyFactors.map(f => '- ' + f).join('\n') : ''}

Write your analysis covering: (1) the tactical and physical match-up, (2) how the venue conditions specifically affect each team, (3) what the power rankings and form tell us, and ${isPlayed ? '(4) a post-match breakdown of what the result means for both teams and the group.' : '(4) your concrete prediction and the most likely outcome.'}

Be direct, specific and analytical. Use real football language. No fluff, no generic statements. Reference the actual condition scores and explain why they matter for this specific fixture.`

  try {
    const msg = await claude.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages:   [{ role: 'user', content: prompt }],
    })

    const analysis = msg.content[0].text

    // Cache to Supabase
    await supabase.from('analyses').upsert({
      fixture_id: fixtureId,
      content:    analysis,
      has_result: isPlayed,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'fixture_id' })

    res.json({ analysis, cached: false })
  } catch (e) {
    console.error('Claude API error:', e.message)
    res.status(500).json({ error: 'Analysis generation failed' })
  }
})

export default router

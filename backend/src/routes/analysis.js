import express  from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const router   = express.Router()
const claude   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

router.post('/:fixtureId', async (req, res) => {
  const { fixtureId } = req.params
  const { home, away, homeRank, awayRank, fixture, prediction, existingResult } = req.body

  try {
    const { data: cached } = await supabase
      .from('analyses')
      .select('*')
      .eq('fixture_id', fixtureId)
      .single()
    if (cached && cached.content) {
      return res.json({ analysis: cached.content, cached: true })
    }
  } catch {}

  const isPlayed   = existingResult && existingResult.home_score !== null
  const resultLine = isPlayed
    ? `Final score: ${home.name} ${existingResult.home_score}-${existingResult.away_score} ${away.name}`
    : `Not yet played. Model prediction: ${home.name} ${prediction?.homeWin}% / Draw ${prediction?.draw}% / ${away.name} ${prediction?.awayWin}%`

  const formHome = homeRank?.form?.slice(-3).join(', ') || 'No games yet'
  const formAway = awayRank?.form?.slice(-3).join(', ') || 'No games yet'

  const prompt = `You are a world-class football analyst covering the 2026 FIFA World Cup. Write a deep, expert match analysis of exactly 6 paragraphs — no headers, just flowing analytical prose.

MATCH: ${home.flag} ${home.name} (FIFA #${home.fifaRank}, Power ${homeRank?.powerScore ?? 'N/A'}/100) vs ${away.flag} ${away.name} (FIFA #${away.fifaRank}, Power ${awayRank?.powerScore ?? 'N/A'}/100)
Group ${fixture.group} · ${fixture.venue}, ${fixture.city} · ${fixture.date}
Status: ${isPlayed ? 'COMPLETED' : 'UPCOMING'} · ${resultLine}
Venue: Altitude ${fixture.altitude}m${fixture.altitude > 1500 ? ' (HIGH — major stamina impact)' : ''} · ${fixture.roofed ? 'Covered roof — heat neutralised' : 'Open air — full weather exposure'}

${home.name.toUpperCase()} DATA:
- FIFA rank #${home.fifaRank} · Power score ${homeRank?.powerScore ?? 'N/A'}/100
- Conditions: Heat ${home.heat} · Pitch ${home.pitch} · Altitude ${home.altitude} · Travel ${home.travel} · Crowd ${home.crowd} · Schedule ${home.schedule}
- Tournament: ${homeRank?.played ?? 0} games · ${homeRank?.points ?? 0} pts · GD ${homeRank?.gd > 0 ? '+' : ''}${homeRank?.gd ?? 0} · Form: ${formHome}
- ${home.insight}

${away.name.toUpperCase()} DATA:
- FIFA rank #${away.fifaRank} · Power score ${awayRank?.powerScore ?? 'N/A'}/100
- Conditions: Heat ${away.heat} · Pitch ${away.pitch} · Altitude ${away.altitude} · Travel ${away.travel} · Crowd ${away.crowd} · Schedule ${away.schedule}
- Tournament: ${awayRank?.played ?? 0} games · ${awayRank?.points ?? 0} pts · GD ${awayRank?.gd > 0 ? '+' : ''}${awayRank?.gd ?? 0} · Form: ${formAway}
- ${away.insight}

${prediction?.keyFactors?.length ? 'Key condition edges:\n' + prediction.keyFactors.map(f => '- ' + f).join('\n') : ''}

Write 6 paragraphs covering:
1. Tactical and physical matchup — formations, style, key duels that will decide this
2. How the specific venue conditions affect each team's players and style
3. What is at stake in the group — who needs points more, what pressure each squad is under
4. Key players on each side who will be most decisive — name real players from these squads
5. ${isPlayed ? 'Post-match analysis — what the scoreline reveals tactically and what it means for group qualification' : 'Prediction with a specific scoreline and how you see the 90 minutes unfolding'}
6. Value bet insight — identify the single best value bet for this fixture based on all the data above. Be specific about WHY this represents value. End with: "This is analytical insight only, not betting advice. Please gamble responsibly."

Be brutally specific. Name real players. Use real football terminology. Reference the actual numbers above. Write like The Athletic.`

  try {
    const msg = await claude.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1500,
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

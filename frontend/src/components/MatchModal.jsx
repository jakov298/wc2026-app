import React, { useState, useEffect } from 'react'
import { useApp }       from '../App'
import { supabase }     from '../lib/supabase'
import { predictMatch } from '../lib/rankings'
import { FIXTURES, VENUE_PITCH } from '../lib/data'

const API = import.meta.env.VITE_API_URL || '/api'

const ALL_ATTRS = [
  { key:'heat',     label:'Heat & humidity',  icon:'☀' },
  { key:'pitch',    label:'Pitch quality',    icon:'🏟' },
  { key:'altitude', label:'Altitude',         icon:'⛰' },
  { key:'travel',   label:'Travel & jet lag', icon:'✈' },
  { key:'crowd',    label:'Crowd pressure',   icon:'👥' },
  { key:'schedule', label:'Fixture load',     icon:'📅' },
  { key:'form',     label:'Form',             icon:'📈' },
]

function toLocalTime(dateStr, timeStr) {
  const dt = new Date(`${dateStr}T${timeStr}:00Z`)
  const time = dt.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:false })
  const tz   = new Intl.DateTimeFormat([], { timeZoneName:'short' })
    .formatToParts(dt).find(p => p.type === 'timeZoneName')?.value ?? ''
  return `${time} ${tz}`
}

// ─── Fixture-specific helpers ─────────────────────────────────────────────────

const CITY_HEAT = {
  'Mexico City':64,'Guadalajara':76,'Monterrey':90,'Dallas':90,'Atlanta':74,
  'Miami':96,'Los Angeles':52,'Seattle':38,'Santa Clara':46,'New York':63,
  'Boston':54,'Philadelphia':70,'Kansas City':83,'Toronto':53,'Vancouver':42,'Houston':96,
}

function calcFixtureHeat(fixture) {
  if (fixture.roofed) return 50
  const base = CITY_HEAT[fixture.city] ?? 60
  const day  = parseInt(fixture.date.split('-')[2])
  const adj  = day <= 14 ? -3 : day >= 21 ? 4 : 0
  return Math.min(100, Math.max(1, base + adj))
}

function heatLabel(v, roofed) {
  if (roofed) return 'Climate-controlled'
  if (v >= 93) return 'Extreme heat'
  if (v >= 83) return 'Very hot'
  if (v >= 70) return 'Hot & humid'
  if (v >= 58) return 'Warm'
  if (v >= 45) return 'Mild'
  return 'Cool'
}

function altLabel(m) {
  if (m >= 2000) return 'Extreme altitude'
  if (m >= 1200) return 'High altitude'
  if (m >= 500)  return 'Moderate altitude'
  return 'Sea level'
}

function getDaysRest(teamId, fixtureDateStr) {
  const prev = FIXTURES
    .filter(f => (f.home === teamId || f.away === teamId) && f.date < fixtureDateStr)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  if (!prev.length) return null
  return Math.round((new Date(fixtureDateStr) - new Date(prev[0].date)) / 86400000)
}

const CROWD_CITY_BOOST = {
  MEX: { 'Mexico City':35,'Guadalajara':35,'Monterrey':35,'Dallas':22,'Houston':22,'Los Angeles':20,'Kansas City':14,'New York':10,'Philadelphia':8,'Atlanta':8,'Miami':8,'Santa Clara':8,'Boston':5,'Seattle':4,'Toronto':2,'Vancouver':2 },
  USA: { 'Dallas':28,'Atlanta':28,'Miami':28,'Los Angeles':28,'Seattle':28,'Santa Clara':28,'New York':28,'Boston':28,'Philadelphia':28,'Kansas City':28,'Houston':28 },
  CAN: { 'Toronto':32,'Vancouver':32,'Seattle':14,'Boston':9,'New York':6 },
  BRA: { 'Miami':14,'New York':9,'Boston':5,'Houston':5,'Los Angeles':4 },
  ARG: { 'Miami':12,'New York':9,'Los Angeles':5,'Houston':4 },
  COL: { 'Miami':14,'New York':9,'Houston':9,'Los Angeles':6 },
  PAN: { 'Miami':10,'New York':9,'Houston':6 },
  HAI: { 'Miami':14,'New York':9,'Boston':6 },
  ECU: { 'New York':9,'Miami':6,'Houston':6 },
  POR: { 'Boston':9,'New York':6 },
  CUW: { 'Miami':9 },
}

function getVenueCrowd(team, city) {
  const boost = (CROWD_CITY_BOOST[team.id] ?? {})[city] ?? 0
  return Math.min(100, team.crowd + boost)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MatchModal({ fixtureId, onClose }) {
  const { getFixture, getTeam, getRanking, results, condWeights } = useApp()

  const fixture  = getFixture(fixtureId)
  const homeTeam = getTeam(fixture?.home)
  const awayTeam = getTeam(fixture?.away)
  const homeRank = getRanking(fixture?.home)
  const awayRank = getRanking(fixture?.away)

  const [analysis,    setAnalysis]    = useState(null)
  const [analyzing,   setAnalyzing]   = useState(false)
  const [fakeLoading, setFakeLoading] = useState(false)
  const [prediction,  setPrediction]  = useState(null)
  const [activeTab,   setActiveTab]   = useState('preview')

  const existingResult = results.find(r => r.fixture_id === fixtureId)
  const played = existingResult && existingResult.home_score !== null

  useEffect(() => {
    if (!fixture || !homeTeam || !awayTeam) return
    const pred = predictMatch(fixture.home, fixture.away, fixture, results, condWeights)
    setPrediction(pred)
    supabase.from('analyses').select('*').eq('fixture_id', fixtureId).single()
      .then(({ data }) => { if (data?.content) setAnalysis(data.content) })
      .catch(() => {})
  }, [fixtureId, results])

  const handleAnalysisClick = async () => {
    if (analyzing || fakeLoading) return
    setActiveTab('analysis')
    if (analysis) {
      setFakeLoading(true)
      const cached = analysis
      setAnalysis(null)
      setTimeout(() => { setAnalysis(cached); setFakeLoading(false) }, 1500)
      return
    }
    setAnalyzing(true)
    try {
      const res = await fetch(`${API}/analysis/${fixtureId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ home: homeTeam, away: awayTeam, homeRank, awayRank, fixture, prediction, existingResult }),
      })
      const data = await res.json()
      if (res.ok) setAnalysis(data.analysis)
      else setAnalysis('Analysis unavailable — please try again later.')
    } catch {
      setAnalysis('Analysis unavailable — please try again later.')
    } finally {
      setAnalyzing(false)
    }
  }

  if (!fixture || !homeTeam || !awayTeam) return null

  const scoreColor = v => v >= 80 ? 'var(--green)' : v >= 65 ? 'var(--blue)' : v >= 50 ? 'var(--orange)' : 'var(--red)'
  const isLoading  = analyzing || fakeLoading

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:200, backdropFilter:'blur(3px)' }}/>
      <div style={{ position:'fixed', inset:'0 0 0 0', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:201, pointerEvents:'none' }}>
        <div style={{
          width:'100%', maxWidth:640, maxHeight:'92dvh',
          background:'var(--bg2)', borderRadius:'16px 16px 0 0',
          border:'0.5px solid var(--border2)',
          overflowY:'auto', pointerEvents:'all',
          animation:'slideUp .3s cubic-bezier(.16,1,.3,1) both',
        }}>
          <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

          <div style={{ padding:'16px 16px 0', position:'sticky', top:0, background:'var(--bg2)', zIndex:10 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{ fontSize:11, color:'var(--txt2)', fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase' }}>
                Group {fixture.group} · {fixture.city} · {fixture.date}
                {fixture.roofed && <span style={{ marginLeft:6, color:'var(--blue)' }}>🏟 Covered</span>}
                {fixture.altitude > 1500 && <span style={{ marginLeft:6, color:'var(--orange)' }}>⛰ High altitude</span>}
              </div>
              <button onClick={onClose} style={{ color:'var(--txt3)', fontSize:20, lineHeight:1, padding:'2px 4px' }}>✕</button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:8, alignItems:'center', marginBottom:14 }}>
              <TeamBlock team={homeTeam} rank={homeRank} side="home" played={played} existingResult={existingResult} />
              <div style={{ textAlign:'center' }}>
                {played ? (
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:36, fontWeight:900 }}>
                    {existingResult.home_score}–{existingResult.away_score}
                  </div>
                ) : (
                  <div style={{ color:'var(--txt3)', fontSize:13, fontWeight:600 }}>vs</div>
                )}
                {!played && prediction && (
                  <div style={{ marginTop:4, fontSize:10, color:'var(--txt3)' }}>
                    <span style={{ color:'var(--blue)' }}>{prediction.homeWin}%</span>
                    {' / '}
                    <span>{prediction.draw}%</span>
                    {' / '}
                    <span style={{ color:'var(--orange)' }}>{prediction.awayWin}%</span>
                  </div>
                )}
              </div>
              <TeamBlock team={awayTeam} rank={awayRank} side="away" played={played} existingResult={existingResult} />
            </div>

            <div style={{ display:'flex', borderBottom:'0.5px solid var(--border)' }}>
              {['preview','conditions','analysis'].map(tab => (
                <button key={tab} onClick={() => tab === 'analysis' ? handleAnalysisClick() : setActiveTab(tab)} style={{
                  flex:1, padding:'8px 0', fontSize:11, fontWeight:600,
                  letterSpacing:'.06em', textTransform:'uppercase',
                  color: activeTab===tab ? 'var(--accent)' : 'var(--txt3)',
                  borderBottom: activeTab===tab ? '2px solid var(--accent)' : '2px solid transparent',
                }}>
                  {tab === 'analysis' && isLoading ? '⟳ Generating…' : tab}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding:16 }}>
            {activeTab === 'preview'    && <PreviewTab fixture={fixture} homeTeam={homeTeam} awayTeam={awayTeam} homeRank={homeRank} awayRank={awayRank} prediction={prediction} played={played} existingResult={existingResult} scoreColor={scoreColor} onAnalysis={handleAnalysisClick} />}
            {activeTab === 'conditions' && <ConditionsTab homeTeam={homeTeam} awayTeam={awayTeam} homeRank={homeRank} awayRank={awayRank} fixture={fixture} scoreColor={scoreColor} />}
            {activeTab === 'analysis'   && <AnalysisTab analysis={analysis} isLoading={isLoading} homeTeam={homeTeam} awayTeam={awayTeam} />}
          </div>
        </div>
      </div>
    </>
  )
}

function TeamBlock({ team, rank, side, played, existingResult }) {
  const align  = side === 'home' ? 'left' : 'right'
  const ps     = rank?.powerScore
  const color  = ps >= 70 ? 'var(--green)' : ps >= 40 ? 'var(--blue)' : 'var(--orange)'
  const winner = played && existingResult && (
    side === 'home' ? existingResult.home_score > existingResult.away_score
                    : existingResult.away_score > existingResult.home_score
  )
  return (
    <div style={{ textAlign: align }}>
      <div style={{ fontSize:32, lineHeight:1, marginBottom:4 }}>{team.flag}</div>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:800, color: winner ? 'var(--accent)' : 'var(--txt)' }}>{team.name}</div>
      <div style={{ fontSize:11, color:'var(--txt3)', marginTop:2 }}>
        {rank?.form?.slice(-3).map((f, i) => (
          <span key={i} className={`tag form-${f}`} style={{ marginLeft: side==='away'?3:0, marginRight: side==='home'?3:0, fontSize:9 }}>{f}</span>
        ))}
      </div>
      {ps !== undefined && <div style={{ fontSize:11, color, marginTop:4, fontWeight:600 }}>Power {ps}</div>}
    </div>
  )
}

function PreviewTab({ fixture, homeTeam, awayTeam, homeRank, awayRank, prediction, played, existingResult, scoreColor, onAnalysis }) {
  const heatVal = calcFixtureHeat(fixture)
  const pitch   = VENUE_PITCH[fixture.venue] ?? 70

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {prediction && !played && (
        <div className="card" style={{ padding:14 }}>
          <div style={{ fontSize:10, color:'var(--txt3)', fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:10 }}>Predicted outcome</div>
          <div style={{ display:'flex', height:10, borderRadius:5, overflow:'hidden', gap:1 }}>
            <div style={{ flex: prediction.homeWin, background:'var(--blue)' }}/>
            <div style={{ flex: prediction.draw,    background:'var(--txt3)' }}/>
            <div style={{ flex: prediction.awayWin, background:'var(--orange)' }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:11 }}>
            <span style={{ color:'var(--blue)' }}>{homeTeam.name} {prediction.homeWin}%</span>
            <span style={{ color:'var(--txt3)' }}>Draw {prediction.draw}%</span>
            <span style={{ color:'var(--orange)' }}>{awayTeam.name} {prediction.awayWin}%</span>
          </div>
          {prediction.keyFactors?.length > 0 && (
            <div style={{ marginTop:10, borderTop:'0.5px solid var(--border)', paddingTop:10, display:'flex', flexDirection:'column', gap:5 }}>
              {prediction.keyFactors.map((f, i) => (
                <div key={i} style={{ fontSize:11, color:'var(--txt2)', display:'flex', gap:6 }}>
                  <span style={{ color:'var(--accent)', flexShrink:0 }}>→</span> {f}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {homeRank && awayRank && (
        <div className="card" style={{ padding:14 }}>
          <div style={{ fontSize:10, color:'var(--txt3)', fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:10 }}>Power index</div>
          {[
            { label:'Power', h: homeRank.powerScore,     a: awayRank.powerScore     },
            { label:'Cond',  h: homeRank.conditionScore, a: awayRank.conditionScore },
          ].map(row => (
            <div key={row.label} style={{ display:'grid', gridTemplateColumns:'1fr 32px 1fr', gap:6, alignItems:'center', marginBottom:8 }}>
              <div className="bar-track" style={{ direction:'rtl' }}><div className="bar-fill" style={{ width:`${row.h}%`, background:'var(--blue)' }}/></div>
              <div style={{ textAlign:'center', fontSize:9, color:'var(--txt3)', fontWeight:600 }}>{row.label}</div>
              <div className="bar-track"><div className="bar-fill" style={{ width:`${row.a}%`, background:'var(--orange)' }}/></div>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:10, color:'var(--txt3)' }}>
            <span style={{ color:'var(--blue)' }}>{homeTeam.flag} {homeTeam.name}</span>
            <span style={{ color:'var(--orange)' }}>{awayTeam.name} {awayTeam.flag}</span>
          </div>
        </div>
      )}

      <div className="card" style={{ padding:14, display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {[
          { label:'Venue',      value: fixture.venue },
          { label:'City',       value: fixture.city },
          { label:'Kickoff',    value: toLocalTime(fixture.date, fixture.time) },
          { label:'Roof',       value: fixture.roofed ? 'Covered ✓' : 'Open air' },
          { label:'Altitude',   value: `${fixture.altitude}m${fixture.altitude > 1500 ? ' ⚠ High' : ''}` },
          { label:'Heat index', value: `${heatVal}/100 — ${heatLabel(heatVal, fixture.roofed)}` },
          { label:'Pitch',      value: `${pitch}/100 quality` },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize:9, color:'var(--txt3)', fontWeight:600, letterSpacing:'.07em', textTransform:'uppercase', marginBottom:3 }}>{label}</div>
            <div style={{ fontSize:12, color:'var(--txt)' }}>{value}</div>
          </div>
        ))}
      </div>

      <button onClick={onAnalysis} style={{
        padding:'12px', background:'rgba(232,200,64,.08)',
        border:'0.5px solid rgba(232,200,64,.3)',
        borderRadius:'var(--r2)', color:'var(--accent)', fontWeight:700, fontSize:12,
        letterSpacing:'.05em', textTransform:'uppercase',
        display:'flex', alignItems:'center', justifyContent:'center', gap:8,
      }}>
        ✦ View AI match analysis
      </button>

      {!played && (
        <div style={{ fontSize:11, color:'var(--txt3)', textAlign:'center', fontStyle:'italic' }}>
          Results update automatically via live API
        </div>
      )}
    </div>
  )
}

function ConditionsTab({ homeTeam, awayTeam, homeRank, awayRank, fixture, scoreColor }) {
  const hScores  = homeRank?.dynamicScores
  const aScores  = awayRank?.dynamicScores
  const heatVal  = calcFixtureHeat(fixture)
  const pitch    = VENUE_PITCH[fixture.venue] ?? 70
  const hRest    = getDaysRest(homeTeam.id, fixture.date)
  const aRest    = getDaysRest(awayTeam.id, fixture.date)
  const hCrowd   = getVenueCrowd(homeTeam, fixture.city)
  const aCrowd   = getVenueCrowd(awayTeam, fixture.city)

  const restLabel = d => d === null ? 'First game' : d === 1 ? '1 day rest' : `${d} days rest`

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div className="card" style={{ padding:12 }}>
        <div style={{ fontSize:10, color:'var(--txt3)', fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:10 }}>
          Match conditions — {fixture.venue}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            { label:'Heat index', val: heatVal,         color: scoreColor(heatVal),                                          sub: heatLabel(heatVal, fixture.roofed) },
            { label:'Altitude',  val: `${fixture.altitude}m`, color: fixture.altitude > 1500 ? 'var(--orange)' : 'var(--txt)', sub: altLabel(fixture.altitude) },
            { label:'Pitch',     val: pitch,             color: scoreColor(pitch),                                            sub: pitch >= 80 ? 'Excellent' : pitch >= 65 ? 'Good' : 'Average' },
            { label:'Roof',      val: fixture.roofed ? '✓' : '—', color: fixture.roofed ? 'var(--blue)' : 'var(--txt)',      sub: fixture.roofed ? 'Climate-controlled' : 'Open air' },
          ].map(({ label, val, color, sub }) => (
            <div key={label}>
              <div style={{ fontSize:9, color:'var(--txt3)', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', marginBottom:3 }}>{label}</div>
              <div style={{ fontSize:18, fontWeight:800, color }}>{val}</div>
              <div style={{ fontSize:10, color:'var(--txt3)', marginTop:1 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {(hRest !== null || aRest !== null) && (
        <div className="card" style={{ padding:12 }}>
          <div style={{ fontSize:10, color:'var(--txt3)', fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:10 }}>
            Days of rest before this game
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[{ team: homeTeam, rest: hRest }, { team: awayTeam, rest: aRest }].map(({ team, rest }) => {
              const color = rest === null ? 'var(--txt3)' : rest <= 4 ? 'var(--red)' : rest <= 5 ? 'var(--orange)' : 'var(--green)'
              return (
                <div key={team.id}>
                  <div style={{ fontSize:10, color:'var(--txt3)', marginBottom:4 }}>{team.flag} {team.name}</div>
                  <div style={{ fontSize:22, fontWeight:800, color }}>{rest ?? '—'}</div>
                  <div style={{ fontSize:10, color:'var(--txt3)', marginTop:1 }}>{restLabel(rest)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {ALL_ATTRS.map(cond => {
        let hv = hScores?.[cond.key] ?? homeTeam[cond.key] ?? 50
        let av = aScores?.[cond.key] ?? awayTeam[cond.key] ?? 50
        if (cond.key === 'crowd') { hv = hCrowd; av = aCrowd }

        const edge        = hv > av + 10 ? homeTeam.name : av > hv + 10 ? awayTeam.name : null
        const neutralised = cond.key === 'heat' && fixture.roofed
        const note = cond.key === 'heat'
          ? (fixture.roofed ? '(climate-controlled)' : `(index: ${heatVal})`)
          : cond.key === 'altitude'
          ? `(${fixture.altitude}m${fixture.altitude > 1500 ? ' — high impact' : ''})`
          : cond.key === 'schedule' && (hRest !== null || aRest !== null)
          ? `(${restLabel(hRest)} / ${restLabel(aRest)})`
          : cond.key === 'crowd'
          ? `(${fixture.city} support)`
          : null

        return (
          <div key={cond.key} className="card" style={{ padding:12, opacity: neutralised ? .5 : 1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:600, color: neutralised ? 'var(--txt3)' : 'var(--txt)' }}>
                {cond.icon} {cond.label}
                {note && <span style={{ marginLeft:6, color:'var(--txt3)', fontWeight:400, fontSize:10 }}>{note}</span>}
              </div>
              {edge && <span className="tag bg-good" style={{ fontSize:9 }}>Edge: {edge}</span>}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 40px 1fr', gap:8, alignItems:'center' }}>
              <div>
                <div style={{ fontSize:10, color:'var(--txt3)', marginBottom:4 }}>{homeTeam.flag} {homeTeam.name}</div>
                <div className="bar-track"><div className="bar-fill" style={{ width:`${hv}%`, background: scoreColor(hv) }}/></div>
                <div style={{ fontSize:13, fontWeight:700, color: scoreColor(hv), marginTop:4 }}>{hv}</div>
              </div>
              <div style={{ textAlign:'center', fontSize:9, color:'var(--txt3)', fontWeight:600 }}>vs</div>
              <div>
                <div style={{ fontSize:10, color:'var(--txt3)', marginBottom:4 }}>{awayTeam.flag} {awayTeam.name}</div>
                <div className="bar-track"><div className="bar-fill" style={{ width:`${av}%`, background: scoreColor(av) }}/></div>
                <div style={{ fontSize:13, fontWeight:700, color: scoreColor(av), marginTop:4 }}>{av}</div>
              </div>
            </div>
          </div>
        )
      })}
      <div style={{ fontSize:10, color:'var(--txt3)', fontStyle:'italic', textAlign:'center', paddingTop:4 }}>
        Scores reflect actual conditions for this specific fixture
      </div>
    </div>
  )
}

function AnalysisTab({ analysis, isLoading, homeTeam, awayTeam }) {
  if (isLoading) return (
    <div style={{ padding:'40px 0', textAlign:'center' }}>
      <div style={{ fontSize:28, marginBottom:12 }}>✦</div>
      <div style={{ color:'var(--txt2)', fontSize:13 }}>
        Generating analysis for {homeTeam.flag} {homeTeam.name} vs {awayTeam.flag} {awayTeam.name}…
      </div>
      <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:8 }}>
        {[80,60,70,50,65].map((w, i) => (
          <div key={i} className="skeleton" style={{ height:12, width:`${w}%`, marginLeft: i%2?'auto':0, borderRadius:6 }}/>
        ))}
      </div>
    </div>
  )

  if (!analysis) return (
    <div style={{ padding:'32px 0', textAlign:'center', color:'var(--txt3)', fontSize:13 }}>
      Analysis unavailable — please try again later.
    </div>
  )

  const paragraphs = analysis.split('\n').filter(p => p.trim())
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {paragraphs.map((p, i) => {
        const isBetting = p.toLowerCase().includes('betting advice') || p.toLowerCase().includes('gamble responsibly')
        return (
          <p key={i} style={{
            fontSize:13,
            color: isBetting ? 'var(--txt3)' : 'var(--txt)',
            lineHeight:1.8,
            fontStyle: isBetting ? 'italic' : 'normal',
            borderTop: isBetting ? '0.5px solid var(--border)' : 'none',
            paddingTop: isBetting ? 10 : 0,
          }}>{p}</p>
        )
      })}
    </div>
  )
}

import React, { useState, useEffect, useCallback } from 'react'
import { useApp }       from '../App'
import { supabase }     from '../lib/supabase'
import { predictMatch } from '../lib/rankings'

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

export default function MatchModal({ fixtureId, onClose }) {
  const { getFixture, getTeam, getRanking, results, condWeights } = useApp()

  const fixture  = getFixture(fixtureId)
  const homeTeam = getTeam(fixture?.home)
  const awayTeam = getTeam(fixture?.away)
  const homeRank = getRanking(fixture?.home)
  const awayRank = getRanking(fixture?.away)

  const [analysis,   setAnalysis]   = useState(null)
  const [analyzing,  setAnalyzing]  = useState(false)
  const [prediction, setPrediction] = useState(null)
  const [activeTab,  setActiveTab]  = useState('preview')

  const existingResult = results.find(r => r.fixture_id === fixtureId)
  const played = existingResult && existingResult.home_score !== null

  const fetchAnalysis = useCallback(async (pred) => {
    if (!fixture || !homeTeam || !awayTeam || analyzing) return
    setAnalyzing(true)
    try {
      const res = await fetch(`${API}/analysis/${fixtureId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          home: homeTeam, away: awayTeam,
          homeRank, awayRank, fixture,
          prediction: pred,
          existingResult,
        }),
      })
      const data = await res.json()
      if (res.ok) setAnalysis(data.analysis)
    } catch {}
    finally { setAnalyzing(false) }
  }, [fixtureId, homeTeam, awayTeam, fixture, homeRank, awayRank, existingResult])

  useEffect(() => {
    if (!fixture || !homeTeam || !awayTeam) return
    const pred = predictMatch(fixture.home, fixture.away, fixture, results, condWeights)
    setPrediction(pred)
    fetchAnalysis(pred)
  }, [fixtureId, results])

  if (!fixture || !homeTeam || !awayTeam) return null

  const scoreColor = v => v >= 80 ? 'var(--green)' : v >= 65 ? 'var(--blue)' : v >= 50 ? 'var(--orange)' : 'var(--red)'

  return (
    <>
      <div onClick={onClose} style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,.75)',
        zIndex:200, backdropFilter:'blur(3px)',
      }}/>
      <div style={{
        position:'fixed', inset:'0 0 0 0', display:'flex',
        alignItems:'flex-end', justifyContent:'center',
        zIndex:201, pointerEvents:'none',
      }}>
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
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  flex:1, padding:'8px 0', fontSize:11, fontWeight:600,
                  letterSpacing:'.06em', textTransform:'uppercase',
                  color: activeTab===tab ? 'var(--accent)' : 'var(--txt3)',
                  borderBottom: activeTab===tab ? '2px solid var(--accent)' : '2px solid transparent',
                }}>
                  {tab === 'analysis' && analyzing ? '⟳ Loading…' : tab}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding:16 }}>
            {activeTab === 'preview'    && <PreviewTab fixture={fixture} homeTeam={homeTeam} awayTeam={awayTeam} homeRank={homeRank} awayRank={awayRank} prediction={prediction} played={played} existingResult={existingResult} scoreColor={scoreColor} />}
            {activeTab === 'conditions' && <ConditionsTab homeTeam={homeTeam} awayTeam={awayTeam} homeRank={homeRank} awayRank={awayRank} fixture={fixture} scoreColor={scoreColor} />}
            {activeTab === 'analysis'   && <AnalysisTab analysis={analysis} analyzing={analyzing} homeTeam={homeTeam} awayTeam={awayTeam} />}
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

function PreviewTab({ fixture, homeTeam, awayTeam, homeRank, awayRank, prediction, played, existingResult, scoreColor }) {
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
            { label:'Power', h: homeRank.powerScore,    a: awayRank.powerScore    },
            { label:'Cond',  h: homeRank.conditionScore,a: awayRank.conditionScore},
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
          { label:'Venue',    value: fixture.venue },
          { label:'City',     value: fixture.city },
          { label:'Altitude', value: `${fixture.altitude}m ${fixture.altitude > 1500 ? '⚠ High' : ''}` },
          { label:'Roof',     value: fixture.roofed ? 'Covered ✓' : 'Open air' },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize:9, color:'var(--txt3)', fontWeight:600, letterSpacing:'.07em', textTransform:'uppercase', marginBottom:3 }}>{label}</div>
            <div style={{ fontSize:12, color:'var(--txt)' }}>{value}</div>
          </div>
        ))}
      </div>

      {!played && (
        <div style={{ fontSize:11, color:'var(--txt3)', textAlign:'center', padding:'8px 0', fontStyle:'italic' }}>
          Results update automatically via live API
        </div>
      )}
    </div>
  )
}

function ConditionsTab({ homeTeam, awayTeam, homeRank, awayRank, fixture, scoreColor }) {
  const hScores = homeRank?.dynamicScores
  const aScores = awayRank?.dynamicScores

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:11, color:'var(--txt3)', lineHeight:1.6 }}>
        Venue: <strong style={{ color:'var(--txt)' }}>{fixture.venue}, {fixture.city}</strong>
        {fixture.roofed && ' · Covered roof — heat & humidity neutralised'}
        {fixture.altitude > 1500 && ` · ${fixture.altitude}m — major stamina impact`}
      </div>
      {ALL_ATTRS.map(cond => {
        const hv = hScores?.[cond.key] ?? homeTeam[cond.key] ?? 50
        const av = aScores?.[cond.key] ?? awayTeam[cond.key] ?? 50
        const edge = hv > av + 10 ? homeTeam.name : av > hv + 10 ? awayTeam.name : null
        const neutralised = cond.key === 'heat' && fixture.roofed
        const note = cond.key === 'heat' && fixture.roofed ? '(neutralised by roof)'
                   : cond.key === 'altitude' ? `(${fixture.altitude}m${fixture.altitude > 1500 ? ' — high impact' : ''})`
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

function AnalysisTab({ analysis, analyzing, homeTeam, awayTeam }) {
  if (analyzing) return (
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

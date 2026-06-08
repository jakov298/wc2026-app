import React, { useState } from 'react'
import { useApp }     from '../App'
import { CONDITIONS } from '../lib/data'

const ALL_ATTRS = [
  ...CONDITIONS,
  { key: 'form', label: 'Form', short: 'Form', icon: '📈' },
]

export default function RankingsPage() {
  const { rankings, condWeights, setCondWeights, loading } = useApp()
  const [showWeights, setShowWeights] = useState(false)
  const [expanded,    setExpanded]    = useState(null)
  const [view,        setView]        = useState('rankings')

  const weights = condWeights || Object.fromEntries(ALL_ATTRS.map(c => [c.key, 1]))

  const resetWeights = () => setCondWeights(null)
  const updateWeight = (key, val) => {
    const num = parseFloat(val)
    setCondWeights({ ...weights, [key]: isNaN(num) ? 0 : Math.max(0, Math.min(3, num)) })
  }
  const toggleExpand = id => setExpanded(p => p === id ? null : id)
  const scoreColor   = v => v >= 80 ? 'var(--green)' : v >= 60 ? 'var(--blue)' : v >= 40 ? 'var(--orange)' : 'var(--red)'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
        <h1 style={{ fontSize:28 }}>Power Rankings</h1>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setView(v => v === 'cards' ? 'rankings' : 'cards')} style={{
            padding:'6px 12px', border:'0.5px solid var(--border2)', borderRadius:'var(--r)',
            fontSize:11, fontWeight:600, color:'var(--txt2)',
          }}>
            {view === 'cards' ? '☰ List' : '▦ Cards'}
          </button>
          <button onClick={() => setShowWeights(p => !p)} style={{
            padding:'6px 12px', border:'0.5px solid var(--border2)', borderRadius:'var(--r)',
            fontSize:11, fontWeight:600, color:'var(--txt2)',
          }}>
            {showWeights ? '▲ Hide' : '▼ Adjust'} weights
          </button>
        </div>
      </div>

      {showWeights && (
        <div className="card" style={{ padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
            <span style={{ fontSize:11, color:'var(--txt3)', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase' }}>
              Attribute weights — drag or type (0 = ignored)
            </span>
            <button onClick={resetWeights} style={{ fontSize:11, color:'var(--accent)', fontWeight:600 }}>Reset equal</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            {ALL_ATTRS.map(c => {
              const total = ALL_ATTRS.reduce((s, x) => s + (weights[x.key] || 0), 0)
              const pct   = total > 0 ? Math.round((weights[c.key] || 0) / total * 100) : 0
              return (
                <div key={c.key}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11, marginBottom:5 }}>
                    <span style={{ color:'var(--txt2)' }}>{c.icon} {c.short}</span>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ color:'var(--txt3)', fontSize:10 }}>{pct}%</span>
                      <input
                        type="number" min="0" max="3" step="0.1"
                        value={weights[c.key] ?? 1}
                        onChange={e => updateWeight(c.key, e.target.value)}
                        style={{
                          width:44, padding:'2px 5px', textAlign:'center',
                          background:'var(--bg3)', border:'0.5px solid var(--border2)',
                          borderRadius:'var(--r)', fontSize:11, color:'var(--txt)',
                        }}
                      />
                    </div>
                  </div>
                  <input type="range" min="0" max="3" step="0.1"
                    value={weights[c.key] ?? 1}
                    onChange={e => updateWeight(c.key, e.target.value)}
                    style={{ width:'100%', accentColor:'var(--accent)' }}/>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop:12, padding:'8px 10px', background:'var(--bg3)', borderRadius:'var(--r)', fontSize:11, color:'var(--txt3)' }}>
            Power score = weighted average of all attributes. Set any to 0 to exclude it. Updates live after every game.
          </div>
        </div>
      )}

      {view === 'rankings' && (
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {loading
            ? Array.from({ length:10 }, (_, i) => (
              <div key={i} className="skeleton" style={{ height:60, borderRadius:'var(--r)', marginBottom:4 }}/>
            ))
            : rankings.map((team, i) => (
              <div key={team.id}>
                <button
                  onClick={() => toggleExpand(team.id)}
                  className="card fade-up"
                  style={{
                    display:'grid', padding:'11px 13px', width:'100%', textAlign:'left',
                    gridTemplateColumns:'24px 28px 1fr auto auto',
                    gap:10, alignItems:'center',
                    animationDelay:`${Math.min(i * 15, 300)}ms`,
                    borderBottomLeftRadius:  expanded === team.id ? 0 : undefined,
                    borderBottomRightRadius: expanded === team.id ? 0 : undefined,
                    borderBottom: expanded === team.id ? 'none' : undefined,
                  }}
                >
                  <span style={{ fontSize:13, color:'var(--txt3)', fontWeight:700, textAlign:'center' }}>{i+1}</span>
                  <span style={{ fontSize:24 }}>{team.flag}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>
                      {team.name}
                      <span style={{ marginLeft:6, fontSize:9, color:'var(--txt3)', fontWeight:400 }}>Grp {team.group}</span>
                    </div>
                    <div style={{ display:'flex', gap:8, marginTop:3, alignItems:'center' }}>
                      <span style={{ fontSize:10, color:'var(--txt3)' }}>
                        {team.played}G · {team.points}pts · {team.gd > 0 ? '+' : ''}{team.gd} GD · FIFA #{team.fifaRank}
                      </span>
                      <div style={{ display:'flex', gap:2 }}>
                        {team.form?.slice(-3).map((f, j) => (
                          <span key={j} className={`tag form-${f}`} style={{ fontSize:8, padding:'1px 4px' }}>{f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right', minWidth:44 }}>
                    <div style={{ fontSize:9, color:'var(--txt3)', marginBottom:2 }}>Cond</div>
                    <div style={{ fontSize:13, fontWeight:700, color: scoreColor(team.conditionScore) }}>
                      {team.conditionScore}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', minWidth:36 }}>
                    <div style={{ fontSize:9, color:'var(--txt3)', marginBottom:2 }}>Power</div>
                    <div style={{ fontSize:22, fontWeight:900, fontFamily:"'Barlow Condensed',sans-serif", color: scoreColor(team.powerScore) }}>
                      {team.powerScore}
                    </div>
                  </div>
                </button>

                {expanded === team.id && (
                  <div style={{
                    background:'var(--bg3)', border:'0.5px solid var(--border)',
                    borderTop:'none', borderRadius:'0 0 var(--r2) var(--r2)',
                    padding:'14px 14px 12px',
                  }}>
                    <div style={{ fontSize:10, color:'var(--txt3)', fontWeight:600, letterSpacing:'.07em', textTransform:'uppercase', marginBottom:10 }}>
                      Attribute scores (1-100) — updates after each game
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 20px', marginBottom:12 }}>
                      {ALL_ATTRS.map(c => {
                        const val = team.dynamicScores?.[c.key] ?? 50
                        return (
                          <div key={c.key}>
                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4 }}>
                              <span style={{ color:'var(--txt2)' }}>{c.icon} {c.label}</span>
                              <span style={{ fontWeight:700, color: scoreColor(val) }}>{val}/100</span>
                            </div>
                            <div className="bar-track">
                              <div className="bar-fill" style={{ width:`${val}%`, background: scoreColor(val) }}/>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ fontSize:11, color:'var(--txt3)', lineHeight:1.6, borderTop:'0.5px solid var(--border)', paddingTop:10 }}>
                      {team.insight}
                    </div>
                    <div style={{ marginTop:8, display:'flex', gap:16, fontSize:11 }}>
                      <span style={{ color:'var(--txt3)' }}>FIFA rank: <strong style={{ color:'var(--txt)' }}>#{team.fifaRank}</strong></span>
                      <span style={{ color:'var(--txt3)' }}>Games: <strong style={{ color:'var(--txt)' }}>{team.played}</strong></span>
                      <span style={{ color:'var(--txt3)' }}>Points: <strong style={{ color:'var(--accent)' }}>{team.points}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            ))
          }
        </div>
      )}

      {view === 'cards' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
          {loading
            ? Array.from({ length:12 }, (_, i) => (
              <div key={i} className="skeleton" style={{ height:200, borderRadius:'var(--r2)' }}/>
            ))
            : rankings.map(team => (
              <div key={team.id} className="card" style={{ padding:'12px 13px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:22 }}>{team.flag}</span>
                  <span style={{ fontSize:18, fontWeight:900, fontFamily:"'Barlow Condensed',sans-serif", color: scoreColor(team.powerScore) }}>
                    {team.powerScore}
                  </span>
                </div>
                <div style={{ fontSize:12, fontWeight:600, marginBottom:2 }}>{team.name}</div>
                <div style={{ fontSize:10, color:'var(--txt3)', marginBottom:8 }}>Group {team.group}</div>
                {ALL_ATTRS.map(c => {
                  const val = team.dynamicScores?.[c.key] ?? 50
                  return (
                    <div key={c.key} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                      <span style={{ fontSize:10, color:'var(--txt3)', width:38, flexShrink:0 }}>{c.short}</span>
                      <div className="bar-track" style={{ flex:1 }}>
                        <div className="bar-fill" style={{ width:`${val}%`, background: scoreColor(val) }}/>
                      </div>
                      <span style={{ fontSize:10, fontWeight:600, color: scoreColor(val), width:22, textAlign:'right' }}>{val}</span>
                    </div>
                  )
                })}
                <div style={{
                  marginTop:6, padding:'2px 8px', borderRadius:10, display:'inline-block',
                  fontSize:10, fontWeight:600,
                  background: team.powerScore>=80?'rgba(34,201,122,.15)':team.powerScore>=60?'rgba(64,144,232,.15)':team.powerScore>=40?'rgba(232,120,64,.15)':'rgba(232,64,64,.15)',
                  color: scoreColor(team.powerScore),
                }}>
                  Overall: {team.powerScore}/100
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

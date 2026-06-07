import React, { useState } from 'react'
import { useApp }      from '../App'
import { CONDITIONS }  from '../lib/data'

export default function RankingsPage() {
  const { rankings, condWeights, setCondWeights, setActiveMatch, loading } = useApp()
  const [sortBy, setSortBy] = useState('powerScore')
  const [showWeights, setShowWeights] = useState(false)

  const weights = condWeights || Object.fromEntries(CONDITIONS.map(c => [c.key, 1]))

  const sorted = [...rankings].sort((a,b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    return (b[sortBy] ?? 0) - (a[sortBy] ?? 0)
  })

  const resetWeights = () => setCondWeights(null)
  const updateWeight = (key, val) => {
    setCondWeights({ ...weights, [key]: parseFloat(val) })
  }

  const scoreClass = v => v>=80?'score-elite':v>=65?'score-good':v>=50?'score-mid':'score-weak'
  const scoreColor = v => v>=80?'var(--green)':v>=65?'var(--blue)':v>=50?'var(--orange)':'var(--red)'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
        <h1 style={{ fontSize:28 }}>Power Rankings</h1>
        <button onClick={()=>setShowWeights(p=>!p)} style={{
          padding:'6px 12px', border:'0.5px solid var(--border2)', borderRadius:'var(--r)',
          fontSize:11, fontWeight:600, color:'var(--txt2)', letterSpacing:'.05em',
        }}>
          {showWeights ? '▲ Hide' : '▼ Adjust'} condition weights
        </button>
      </div>

      {/* Weight sliders */}
      {showWeights && (
        <div className="card" style={{ padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
            <span style={{ fontSize:11, color:'var(--txt3)', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase' }}>Condition importance</span>
            <button onClick={resetWeights} style={{ fontSize:11, color:'var(--accent)', fontWeight:600 }}>Reset equal</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {CONDITIONS.map(c => {
              const total = CONDITIONS.reduce((s,x)=>s+(weights[x.key]||0),0)
              const pct   = total > 0 ? Math.round((weights[c.key]||0)/total*100) : 0
              return (
                <div key={c.key}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:5 }}>
                    <span style={{ color:'var(--txt2)' }}>{c.icon} {c.short}</span>
                    <span style={{ fontWeight:600, color:'var(--accent)' }}>{pct}%</span>
                  </div>
                  <input type="range" min="0" max="3" step="0.1" value={weights[c.key]||1}
                    onChange={e=>updateWeight(c.key, e.target.value)}
                    style={{ width:'100%', accentColor:'var(--accent)' }}/>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sort controls */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {[
          { key:'powerScore',    label:'Power' },
          { key:'points',        label:'Points' },
          { key:'conditionScore',label:'Conditions' },
          { key:'formScore',     label:'Form' },
          { key:'gd',            label:'Goal diff' },
        ].map(s => (
          <button key={s.key} onClick={()=>setSortBy(s.key)} style={{
            padding:'5px 11px', borderRadius:20, fontSize:11, fontWeight:600,
            background: sortBy===s.key ? 'var(--accent)' : 'var(--bg3)',
            color:      sortBy===s.key ? '#000' : 'var(--txt3)',
            border:'0.5px solid '+(sortBy===s.key?'var(--accent)':'var(--border)'),
          }}>{s.label}</button>
        ))}
      </div>

      {/* Rankings list */}
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {loading
          ? Array.from({length:10},(_,i)=>(<div key={i} className="skeleton" style={{ height:60, borderRadius:'var(--r)', marginBottom:4 }}/>))
          : sorted.map((team, i) => (
            <button key={team.id} onClick={()=>{}} className="card fade-up" style={{
              display:'grid', padding:'11px 13px', width:'100%', textAlign:'left', cursor:'default',
              gridTemplateColumns:'24px 28px 1fr auto auto',
              gap:10, alignItems:'center',
              animationDelay: `${Math.min(i*20,200)}ms`,
            }}>
              <span style={{ fontSize:13, color:'var(--txt3)', fontWeight:700, textAlign:'center' }}>{i+1}</span>
              <span style={{ fontSize:24 }}>{team.flag}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:600 }}>{team.name}
                  <span style={{ marginLeft:6, fontSize:9, color:'var(--txt3)', fontWeight:400 }}>Grp {team.group}</span>
                </div>
                <div style={{ display:'flex', gap:8, marginTop:3, alignItems:'center' }}>
                  <span style={{ fontSize:10, color:'var(--txt3)' }}>
                    {team.played}G · {team.points}pts · {team.gd>0?'+':''}{team.gd} GD
                  </span>
                  <div style={{ display:'flex', gap:2 }}>
                    {team.form?.slice(-3).map((f,j)=>(
                      <span key={j} className={`tag form-${f}`} style={{ fontSize:8, padding:'1px 4px' }}>{f}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <div style={{ width:60, textAlign:'right' }}>
                  <div style={{ fontSize:9, color:'var(--txt3)', marginBottom:3 }}>Conditions</div>
                  <div style={{ fontSize:12, fontWeight:700, color: scoreColor(team.conditionScore) }}>
                    {team.conditionScore}
                  </div>
                </div>
              </div>
              <div style={{ textAlign:'right', minWidth:36 }}>
                <div style={{ fontSize:9, color:'var(--txt3)', marginBottom:3 }}>Power</div>
                <div style={{ fontSize:20, fontWeight:900, fontFamily:"'Barlow Condensed',sans-serif", color: scoreColor(team.powerScore) }}>
                  {team.powerScore}
                </div>
              </div>
            </button>
          ))
        }
      </div>
    </div>
  )
}

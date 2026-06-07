import React, { useState, useMemo } from 'react'
import { useApp }    from '../App'
import { FIXTURES }  from '../lib/data'

export default function FixturePage() {
  const { results, setActiveMatch, getTeam, rankings } = useApp()
  const [filter,  setFilter]  = useState('all')   // all | played | upcoming
  const [search,  setSearch]  = useState('')
  const [group,   setGroup]   = useState('all')

  const filtered = useMemo(() => {
    return FIXTURES.filter(f => {
      const r       = results.find(x => x.fixture_id === f.id && x.home_score !== null)
      const played  = !!r
      const home    = getTeam(f.home)
      const away    = getTeam(f.away)
      const q       = search.toLowerCase()

      if (filter === 'played'   && !played) return false
      if (filter === 'upcoming' && played)  return false
      if (group  !== 'all'      && f.group !== group) return false
      if (q && !home?.name.toLowerCase().includes(q) && !away?.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [results, filter, search, group])

  const scoreColor = v => v>=80?'var(--green)':v>=65?'var(--blue)':v>=50?'var(--orange)':'var(--red)'

  // Group fixtures by date
  const byDate = filtered.reduce((acc, f) => {
    acc[f.date] = acc[f.date] || []
    acc[f.date].push(f)
    return acc
  }, {})

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <h1 style={{ fontSize:28 }}>Fixtures</h1>

      {/* Filters */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
        <input
          type="text"
          placeholder="Search team…"
          value={search}
          onChange={e=>setSearch(e.target.value)}
          style={{
            padding:'6px 10px', background:'var(--bg3)', border:'0.5px solid var(--border2)',
            borderRadius:'var(--r)', fontSize:12, color:'var(--txt)',
            outline:'none', minWidth:140,
          }}
        />
        {['all','upcoming','played'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{
            padding:'5px 11px', borderRadius:20, fontSize:11, fontWeight:600, letterSpacing:'.04em',
            background: filter===f?'var(--accent)':'var(--bg3)',
            color:      filter===f?'#000':'var(--txt3)',
            border:'0.5px solid '+(filter===f?'var(--accent)':'var(--border)'),
          }}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>
        ))}
        <select value={group} onChange={e=>setGroup(e.target.value)} style={{
          padding:'5px 10px', background:'var(--bg3)', border:'0.5px solid var(--border2)',
          borderRadius:'var(--r)', fontSize:11, color:'var(--txt2)',
        }}>
          <option value="all">All groups</option>
          {'ABCDEFGHIJKL'.split('').map(g=>(
            <option key={g} value={g}>Group {g}</option>
          ))}
        </select>
      </div>

      {/* Fixtures by date */}
      {Object.entries(byDate).sort().map(([date, fixtures]) => (
        <div key={date}>
          <div style={{ fontSize:11, color:'var(--txt3)', fontWeight:600, letterSpacing:'.07em', textTransform:'uppercase', marginBottom:8, paddingTop:4 }}>
            {new Date(date+'T12:00:00').toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'long' })}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {fixtures.map(f => {
              const r      = results.find(x => x.fixture_id === f.id && x.home_score !== null)
              const home   = getTeam(f.home)
              const away   = getTeam(f.away)
              const homeRk = rankings.find(x => x.id === f.home)
              const awayRk = rankings.find(x => x.id === f.away)
              if (!home || !away) return null

              const winner = r ? (r.home_score > r.away_score ? 'home' : r.away_score > r.home_score ? 'away' : 'draw') : null

              return (
                <button key={f.id} onClick={()=>setActiveMatch(f.id)} className="card fade-up" style={{
                  display:'grid', gridTemplateColumns:'1fr 80px 1fr',
                  gap:8, padding:'12px 14px', width:'100%', textAlign:'left', alignItems:'center',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:22 }}>{home.flag}</span>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color: winner==='home'?'var(--accent)':'var(--txt)' }}>{home.name}</div>
                      {homeRk && <div style={{ fontSize:10, color: scoreColor(homeRk.powerScore) }}>⚡ {homeRk.powerScore}</div>}
                    </div>
                  </div>

                  <div style={{ textAlign:'center' }}>
                    {r ? (
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:26, fontWeight:900, letterSpacing:'.04em' }}>
                        {r.home_score}–{r.away_score}
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize:12, color:'var(--txt2)', fontWeight:600 }}>{f.time}</div>
                        <div style={{ fontSize:9, color:'var(--txt3)', marginTop:2 }}>{f.city}</div>
                      </>
                    )}
                    <div style={{ fontSize:8, color:'var(--txt3)', marginTop:2 }}>
                      {f.roofed?'🏟':'🌤'} Grp {f.group}
                    </div>
                  </div>

                  <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end' }}>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:13, fontWeight:600, color: winner==='away'?'var(--accent)':'var(--txt)' }}>{away.name}</div>
                      {awayRk && <div style={{ fontSize:10, color: scoreColor(awayRk.powerScore) }}>⚡ {awayRk.powerScore}</div>}
                    </div>
                    <span style={{ fontSize:22 }}>{away.flag}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 0', color:'var(--txt3)', fontSize:13 }}>
          No fixtures match your filter
        </div>
      )}
    </div>
  )
}

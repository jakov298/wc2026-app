import React, { useState } from 'react'
import { useApp }   from '../App'
import { GROUPS, FIXTURES } from '../lib/data'
import { buildStandings }   from '../lib/rankings'

export default function GroupsPage() {
  const { results, rankings, setActiveMatch, getTeam } = useApp()
  const standings = buildStandings(results)
  const [activeGroup, setActiveGroup] = useState('A')

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <h1 style={{ fontSize:28 }}>Groups</h1>

      {/* Group selector */}
      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
        {GROUPS.map(g => (
          <button key={g} onClick={()=>setActiveGroup(g)} style={{
            width:36, height:36, borderRadius:'var(--r)',
            fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:15,
            background: activeGroup===g ? 'var(--accent)' : 'var(--bg3)',
            color:      activeGroup===g ? '#000' : 'var(--txt2)',
            border:'0.5px solid '+(activeGroup===g?'var(--accent)':'var(--border)'),
          }}>{g}</button>
        ))}
      </div>

      <GroupView
        group={activeGroup}
        standings={standings}
        results={results}
        rankings={rankings}
        setActiveMatch={setActiveMatch}
        getTeam={getTeam}
      />
    </div>
  )
}

function GroupView({ group, standings, results, rankings, setActiveMatch, getTeam }) {
  const groupTeams = Object.values(standings)
    .filter(s => getTeam(s.teamId)?.group === group)
    .sort((a,b) => b.points-a.points || b.gd-a.gd || b.gf-a.gf)

  const groupFixtures = FIXTURES.filter(f => f.group === group)
  const scoreColor = v => v>=80?'var(--green)':v>=65?'var(--blue)':v>=50?'var(--orange)':'var(--red)'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Standings table */}
      <div className="card" style={{ overflow:'hidden' }}>
        <div style={{ padding:'10px 13px 6px', borderBottom:'0.5px solid var(--border)', fontSize:11, color:'var(--txt3)', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase' }}>
          Group {group} standings
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ fontSize:9, color:'var(--txt3)', fontWeight:600, letterSpacing:'.07em', textTransform:'uppercase' }}>
              <th style={{ padding:'7px 13px', textAlign:'left' }}>#</th>
              <th style={{ padding:'7px 4px', textAlign:'left' }}>Team</th>
              <th style={{ padding:'7px 6px', textAlign:'center' }}>P</th>
              <th style={{ padding:'7px 6px', textAlign:'center' }}>W</th>
              <th style={{ padding:'7px 6px', textAlign:'center' }}>D</th>
              <th style={{ padding:'7px 6px', textAlign:'center' }}>L</th>
              <th style={{ padding:'7px 6px', textAlign:'center' }}>GD</th>
              <th style={{ padding:'7px 6px', textAlign:'center' }}>Pts</th>
              <th style={{ padding:'7px 10px', textAlign:'center' }}>Power</th>
            </tr>
          </thead>
          <tbody>
            {groupTeams.map((s, i) => {
              const team  = getTeam(s.teamId)
              const rank  = rankings.find(r => r.id === s.teamId)
              const qual  = i < 2
              const maybe = i === 2
              if (!team) return null

              return (
                <tr key={s.teamId} style={{
                  borderTop:'0.5px solid var(--border)',
                  background: qual ? 'rgba(34,201,122,.04)' : maybe ? 'rgba(64,144,232,.04)' : 'transparent',
                }}>
                  <td style={{ padding:'9px 13px', fontSize:12, color:'var(--txt3)', fontWeight:700 }}>
                    {qual && <span style={{ display:'inline-block', width:3, height:24, background:'var(--green)', borderRadius:2, marginRight:8, verticalAlign:'middle' }}/>}
                    {maybe && <span style={{ display:'inline-block', width:3, height:24, background:'var(--blue)', borderRadius:2, marginRight:8, verticalAlign:'middle' }}/>}
                    {i+1}
                  </td>
                  <td style={{ padding:'9px 4px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <span style={{ fontSize:18 }}>{team.flag}</span>
                      <span style={{ fontSize:12, fontWeight:600 }}>{team.name}</span>
                    </div>
                  </td>
                  <td style={{ padding:'9px 6px', textAlign:'center', fontSize:12, color:'var(--txt2)' }}>{s.played}</td>
                  <td style={{ padding:'9px 6px', textAlign:'center', fontSize:12, color:'var(--green)' }}>{s.won}</td>
                  <td style={{ padding:'9px 6px', textAlign:'center', fontSize:12, color:'var(--txt3)' }}>{s.drawn}</td>
                  <td style={{ padding:'9px 6px', textAlign:'center', fontSize:12, color:'var(--red)' }}>{s.lost}</td>
                  <td style={{ padding:'9px 6px', textAlign:'center', fontSize:12, color: s.gd>0?'var(--green)':s.gd<0?'var(--red)':'var(--txt3)' }}>
                    {s.gd>0?'+':''}{s.gd}
                  </td>
                  <td style={{ padding:'9px 6px', textAlign:'center', fontFamily:"'Barlow Condensed',sans-serif", fontSize:17, fontWeight:900, color:'var(--accent)' }}>
                    {s.points}
                  </td>
                  <td style={{ padding:'9px 10px', textAlign:'center' }}>
                    {rank && (
                      <span style={{ fontSize:13, fontWeight:800, fontFamily:"'Barlow Condensed',sans-serif", color: scoreColor(rank.powerScore) }}>
                        {rank.powerScore}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div style={{ padding:'6px 13px 8px', fontSize:9, color:'var(--txt3)' }}>
          <span style={{ marginRight:12 }}>🟢 Qualify top 2</span>
          <span>🔵 Possible best 3rd</span>
        </div>
      </div>

      {/* Fixtures for this group */}
      <div>
        <div style={{ fontSize:11, color:'var(--txt3)', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', marginBottom:8 }}>
          Fixtures
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {groupFixtures.map(f => {
            const r       = results.find(x => x.fixture_id === f.id && x.home_score !== null)
            const home    = getTeam(f.home)
            const away    = getTeam(f.away)
            const homeRk  = rankings.find(x => x.id === f.home)
            const awayRk  = rankings.find(x => x.id === f.away)
            if (!home || !away) return null

            return (
              <button key={f.id} onClick={()=>setActiveMatch(f.id)} className="card" style={{
                display:'grid', gridTemplateColumns:'1fr auto 1fr',
                gap:10, padding:'11px 13px', width:'100%', textAlign:'left', alignItems:'center',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <span style={{ fontSize:20 }}>{home.flag}</span>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600 }}>{home.name}</div>
                    {homeRk && <div style={{ fontSize:10, color: scoreColor(homeRk.powerScore) }}>Power {homeRk.powerScore}</div>}
                  </div>
                </div>

                <div style={{ textAlign:'center', minWidth:60 }}>
                  {r ? (
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:24, fontWeight:900, letterSpacing:'.04em' }}>
                      {r.home_score}–{r.away_score}
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize:11, color:'var(--txt2)', fontWeight:600 }}>{f.time}</div>
                      <div style={{ fontSize:9, color:'var(--txt3)' }}>{f.date.slice(5)}</div>
                      {f.roofed && <div style={{ fontSize:8, color:'var(--blue)', marginTop:2 }}>🏟 Covered</div>}
                    </>
                  )}
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:7, justifyContent:'flex-end' }}>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:12, fontWeight:600 }}>{away.name}</div>
                    {awayRk && <div style={{ fontSize:10, color: scoreColor(awayRk.powerScore) }}>Power {awayRk.powerScore}</div>}
                  </div>
                  <span style={{ fontSize:20 }}>{away.flag}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

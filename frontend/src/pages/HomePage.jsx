import React, { useState, useEffect } from 'react'
import { Link }       from 'react-router-dom'
import { useApp }     from '../App'
import { FIXTURES }   from '../lib/data'

export default function HomePage() {
  const { rankings, results, setActiveMatch, loading } = useApp()
  const top5 = rankings.slice(0, 5)

  const today = new Date().toISOString().split('T')[0]
  const upcoming = FIXTURES
    .filter(f => f.date >= today && !results.find(r => r.fixture_id === f.id && r.home_score !== null))
    .slice(0, 6)
  const recent = [...results]
    .filter(r => r.home_score !== null)
    .sort((a, b) => new Date(b.played_at) - new Date(a.played_at))
    .slice(0, 4)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Hero */}
      <div style={{ textAlign:'center', padding:'24px 0 8px' }}>
        <h1 style={{ fontSize:42, marginBottom:6 }}>
          WC 2026 <span style={{ color:'var(--accent)' }}>Intelligence</span>
        </h1>
        <p style={{ color:'var(--txt2)', fontSize:13, maxWidth:400, margin:'0 auto', lineHeight:1.6 }}>
          Live power rankings updated after every result · AI match analysis · Condition-adjusted predictions for all 48 teams
        </p>
      </div>

      {/* AdSense banner slot — replace with your ad unit code */}
      <div id="ad-home-top" style={{
        minHeight:80, background:'var(--bg3)', borderRadius:'var(--r)',
        border:'0.5px dashed var(--border)', display:'flex', alignItems:'center',
        justifyContent:'center', fontSize:10, color:'var(--txt3)', letterSpacing:'.06em',
      }}>
        {/* PASTE YOUR ADSENSE BANNER UNIT HERE */}
        Advertisement
      </div>

      {/* Top 5 power rankings */}
      <Section title="Power rankings" link="/rankings" linkLabel="See all 48">
        {loading ? (
          Array.from({length:5},(_,i)=>(
            <div key={i} className="skeleton" style={{ height:52, borderRadius:'var(--r)', marginBottom:6 }}/>
          ))
        ) : top5.map((team, i) => (
          <RankRow key={team.id} team={team} rank={i+1} />
        ))}
      </Section>

      {/* Recent results */}
      {recent.length > 0 && (
        <Section title="Recent results" link="/fixtures" linkLabel="All fixtures">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {recent.map(r => <ResultCard key={r.fixture_id} result={r} onOpen={setActiveMatch} />)}
          </div>
        </Section>
      )}

      {/* Upcoming fixtures */}
      <Section title="Upcoming fixtures" link="/fixtures" linkLabel="Full schedule">
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {upcoming.map(f => <UpcomingRow key={f.id} fixture={f} onOpen={setActiveMatch} />)}
        </div>
      </Section>

      {/* Bottom ad slot */}
      <div id="ad-home-bottom" style={{
        minHeight:100, background:'var(--bg3)', borderRadius:'var(--r)',
        border:'0.5px dashed var(--border)', display:'flex', alignItems:'center',
        justifyContent:'center', fontSize:10, color:'var(--txt3)', letterSpacing:'.06em',
      }}>
        {/* PASTE YOUR ADSENSE RECTANGLE UNIT HERE */}
        Advertisement
      </div>
    </div>
  )
}

function Section({ title, link, linkLabel, children }) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
        <h2 style={{ fontSize:18, letterSpacing:'.04em' }}>{title}</h2>
        {link && <Link to={link} style={{ fontSize:11, color:'var(--accent)', fontWeight:600 }}>{linkLabel} →</Link>}
      </div>
      {children}
    </div>
  )
}

function RankRow({ team, rank }) {
  const c = team.powerScore>=70?'var(--green)':team.powerScore>=55?'var(--blue)':team.powerScore>=40?'var(--orange)':'var(--red)'
  return (
    <div className="card" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', marginBottom:5 }}>
      <span style={{ fontSize:13, color:'var(--txt3)', fontWeight:700, width:20, textAlign:'center' }}>{rank}</span>
      <span style={{ fontSize:22 }}>{team.flag}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:600 }}>{team.name}</div>
        <div style={{ fontSize:10, color:'var(--txt3)' }}>
          Group {team.group} · {team.played}G {team.points}pts {team.gd > 0 ? '+' : ''}{team.gd} GD
        </div>
      </div>
      <div style={{ display:'flex', gap:2 }}>
        {team.form?.slice(-3).map((f,i)=>(
          <span key={i} className={`tag form-${f}`} style={{ fontSize:9, padding:'1px 5px' }}>{f}</span>
        ))}
      </div>
      <span style={{ fontSize:16, fontWeight:800, color:c, minWidth:26, textAlign:'right' }}>{team.powerScore}</span>
    </div>
  )
}

function ResultCard({ result, onOpen }) {
  const { getTeam, getFixture } = useApp()
  const fixture  = getFixture(result.fixture_id)
  const homeTeam = getTeam(result.home_team)
  const awayTeam = getTeam(result.away_team)
  if (!homeTeam || !awayTeam) return null

  const winner = result.home_score > result.away_score ? 'home'
               : result.away_score > result.home_score ? 'away' : 'draw'

  return (
    <button onClick={() => onOpen(result.fixture_id)} className="card" style={{ padding:12, textAlign:'left', width:'100%' }}>
      <div style={{ fontSize:9, color:'var(--txt3)', marginBottom:6, letterSpacing:'.06em', textTransform:'uppercase' }}>
        Group {fixture?.group} · {fixture?.city}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'space-between' }}>
        <span style={{ fontSize:16 }}>{homeTeam.flag}</span>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:900, letterSpacing:'.04em' }}>
          <span style={{ color: winner==='home'?'var(--accent)':'var(--txt)' }}>{result.home_score}</span>
          {' – '}
          <span style={{ color: winner==='away'?'var(--accent)':'var(--txt)' }}>{result.away_score}</span>
        </span>
        <span style={{ fontSize:16 }}>{awayTeam.flag}</span>
      </div>
      <div style={{ fontSize:10, color:'var(--txt3)', marginTop:4, textAlign:'center' }}>
        {homeTeam.name} · {awayTeam.name}
      </div>
    </button>
  )
}

function UpcomingRow({ fixture, onOpen }) {
  const { getTeam } = useApp()
  const home = getTeam(fixture.home)
  const away = getTeam(fixture.away)
  if (!home || !away) return null

  return (
    <button onClick={() => onOpen(fixture.id)} className="card" style={{
      display:'flex', alignItems:'center', gap:10, padding:'10px 12px', width:'100%', textAlign:'left',
    }}>
      <div style={{ flex:1, display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:18 }}>{home.flag}</span>
        <span style={{ fontSize:12, fontWeight:600 }}>{home.name}</span>
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:10, color:'var(--txt3)', fontWeight:600 }}>{fixture.time}</div>
        <div style={{ fontSize:9, color:'var(--txt3)', marginTop:1 }}>{fixture.date.slice(5)}</div>
      </div>
      <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end' }}>
        <span style={{ fontSize:12, fontWeight:600 }}>{away.name}</span>
        <span style={{ fontSize:18 }}>{away.flag}</span>
      </div>
      <span style={{ fontSize:14, color:'var(--txt3)', marginLeft:4 }}>›</span>
    </button>
  )
}

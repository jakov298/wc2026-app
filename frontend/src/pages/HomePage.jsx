import React, { useEffect } from 'react'
import { Link }     from 'react-router-dom'
import { useApp }   from '../App'
import { FIXTURES } from '../lib/data'

function AdBanner({ slot }) {
  useEffect(() => {
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}) } catch {}
  }, [])
  return (
    <ins className="adsbygoogle"
      style={{ display:'block', width:'100%' }}
      data-ad-client="ca-pub-4765456413213962"
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"/>
  )
}

export default function HomePage() {
  const { rankings, results, setActiveMatch, loading } = useApp()
  const top5 = rankings.slice(0, 5)

  const today = new Date().toISOString().split('T')[0]

  const upcoming = FIXTURES
    .filter(f => f.date >= today && !results.find(r => r.fixture_id === f.id && r.home_score !== null))
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return a.time.localeCompare(b.time)
    })
    .slice(0, 6)

  const recent = [...results]
    .filter(r => r.home_score !== null)
    .sort((a, b) => new Date(b.played_at) - new Date(a.played_at))
    .slice(0, 4)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      <div style={{ textAlign:'center', padding:'24px 0 8px' }}>
        <h1 style={{ fontSize:48, marginBottom:6 }}>
          WC 2026 <span style={{ color:'var(--accent)' }}>Intelligence</span>
        </h1>
        <p style={{ color:'var(--txt2)', fontSize:14, maxWidth:560, margin:'0 auto', lineHeight:1.6 }}>
          Live power rankings updated after every result · AI match analysis · Condition-adjusted predictions for all 48 teams
        </p>
      </div>

      {/* Top ad */}
      <AdBanner slot="7416715343" />

      <Section title="Power rankings" link="/rankings" linkLabel="See all 48">
        {loading
          ? Array.from({length:5},(_,i)=>(
            <div key={i} className="skeleton" style={{ height:56, borderRadius:'var(--r)', marginBottom:6 }}/>
          ))
          : top5.map((team, i) => <RankRow key={team.id} team={team} rank={i+1} />)
        }
      </Section>

      {recent.length > 0 && (
        <Section title="Recent results" link="/fixtures" linkLabel="All fixtures">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8 }}>
            {recent.map(r => <ResultCard key={r.fixture_id} result={r} onOpen={setActiveMatch} />)}
          </div>
        </Section>
      )}

      <Section title="Upcoming fixtures" link="/fixtures" linkLabel="Full schedule">
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {upcoming.map(f => <UpcomingRow key={f.id} fixture={f} onOpen={setActiveMatch} />)}
        </div>
      </Section>

      {/* Bottom ad */}
      <AdBanner slot="8047270733" />

    </div>
  )
}

function Section({ title, link, linkLabel, children }) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:12 }}>
        <h2 style={{ fontSize:22, letterSpacing:'.04em' }}>{title}</h2>
        {link && <Link to={link} style={{ fontSize:13, color:'var(--accent)', fontWeight:600 }}>{linkLabel} →</Link>}
      </div>
      {children}
    </div>
  )
}

function RankRow({ team, rank }) {
  const c = team.powerScore>=70?'var(--green)':team.powerScore>=55?'var(--blue)':team.powerScore>=40?'var(--orange)':'var(--red)'
  return (
    <div className="card" style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 16px', marginBottom:5 }}>
      <span style={{ fontSize:15, color:'var(--txt3)', fontWeight:700, width:24, textAlign:'center' }}>{rank}</span>
      <span style={{ fontSize:28 }}>{team.flag}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:15, fontWeight:600 }}>{team.name}</div>
        <div style={{ fontSize:12, color:'var(--txt3)' }}>
          Group {team.group} · {team.played}G {team.points}pts {team.gd > 0 ? '+' : ''}{team.gd} GD
        </div>
      </div>
      <div style={{ display:'flex', gap:2 }}>
        {team.form?.slice(-3).map((f,i)=>(
          <span key={i} className={`tag form-${f}`} style={{ fontSize:10, padding:'2px 6px' }}>{f}</span>
        ))}
      </div>
      <span style={{ fontSize:22, fontWeight:800, color:c, minWidth:32, textAlign:'right' }}>{team.powerScore}</span>
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
    <button onClick={() => onOpen(result.fixture_id)} className="card" style={{ padding:14, textAlign:'left', width:'100%' }}>
      <div style={{ fontSize:10, color:'var(--txt3)', marginBottom:8, letterSpacing:'.06em', textTransform:'uppercase' }}>
        Group {fixture?.group} · {fixture?.city}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'space-between' }}>
        <span style={{ fontSize:22 }}>{homeTeam.flag}</span>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:26, fontWeight:900 }}>
          <span style={{ color: winner==='home'?'var(--accent)':'var(--txt)' }}>{result.home_score}</span>
          {' – '}
          <span style={{ color: winner==='away'?'var(--accent)':'var(--txt)' }}>{result.away_score}</span>
        </span>
        <span style={{ fontSize:22 }}>{awayTeam.flag}</span>
      </div>
      <div style={{ fontSize:12, color:'var(--txt3)', marginTop:6, textAlign:'center' }}>
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
      display:'flex', alignItems:'center', gap:14, padding:'13px 16px', width:'100%', textAlign:'left',
    }}>
      <div style={{ flex:1, display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:24 }}>{home.flag}</span>
        <span style={{ fontSize:14, fontWeight:600 }}>{home.name}</span>
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:12, color:'var(--txt3)', fontWeight:600 }}>{fixture.time}</div>
        <div style={{ fontSize:11, color:'var(--txt3)', marginTop:1 }}>{fixture.date.slice(5)}</div>
      </div>
      <div style={{ flex:1, display:'flex', alignItems:'center', gap:10, justifyContent:'flex-end' }}>
        <span style={{ fontSize:14, fontWeight:600 }}>{away.name}</span>
        <span style={{ fontSize:24 }}>{away.flag}</span>
      </div>
      <span style={{ fontSize:18, color:'var(--txt3)', marginLeft:4 }}>›</span>
    </button>
  )
}

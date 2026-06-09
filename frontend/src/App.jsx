import React, { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import './styles/global.css'

import HomePage      from './pages/HomePage'
import GroupsPage    from './pages/GroupsPage'
import RankingsPage  from './pages/RankingsPage'
import FixturePage   from './pages/FixturePage'
import PrivacyPage   from './pages/PrivacyPage'
import MatchModal    from './components/MatchModal'

import { api }                  from './lib/supabase'
import { computePowerRankings } from './lib/rankings'
import { TEAMS, FIXTURES }      from './lib/data'

export const AppCtx = createContext(null)
export const useApp = () => useContext(AppCtx)

export default function App() {
  const [results,     setResults]     = useState([])
  const [rankings,    setRankings]    = useState([])
  const [condWeights, setCondWeights] = useState(null)
  const [activeMatch, setActiveMatch] = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [darkMode,    setDarkMode]    = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('light', !darkMode)
  }, [darkMode])

  useEffect(() => {
    document.documentElement.classList.add('light')
  }, [])

  useEffect(() => {
    api.getResults()
      .then(r => {
        setResults(r)
        setRankings(computePowerRankings(r, condWeights))
      })
      .catch(() => {
        setRankings(computePowerRankings([], condWeights))
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setRankings(computePowerRankings(results, condWeights))
  }, [results, condWeights])

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const fresh = await api.getResults()
        setResults(fresh)
      } catch {}
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  const ctx = {
    results, setResults,
    rankings,
    condWeights, setCondWeights,
    activeMatch, setActiveMatch,
    loading,
    getTeam:    id => TEAMS.find(t => t.id === id),
    getFixture: id => FIXTURES.find(f => f.id === id),
    getRanking: id => rankings.find(r => r.id === id),
  }

  return (
    <AppCtx.Provider value={ctx}>
      <BrowserRouter>
        <Layout darkMode={darkMode} setDarkMode={setDarkMode}>
          <Routes>
            <Route path="/"          element={<HomePage   />} />
            <Route path="/groups"    element={<GroupsPage />} />
            <Route path="/rankings"  element={<RankingsPage />} />
            <Route path="/fixtures"  element={<FixturePage />} />
            <Route path="/privacy"   element={<PrivacyPage />} />
          </Routes>
        </Layout>
        {activeMatch && (
          <MatchModal fixtureId={activeMatch} onClose={() => setActiveMatch(null)} />
        )}
        <Analytics />
      </BrowserRouter>
    </AppCtx.Provider>
  )
}

function Layout({ children, darkMode, setDarkMode }) {
  const loc = useLocation()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const nav = [
    { to: '/',         label: 'Home'     },
    { to: '/fixtures', label: 'Fixtures' },
    { to: '/groups',   label: 'Groups'   },
    { to: '/rankings', label: 'Rankings' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100dvh' }}>
      <header style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 16px', height:52,
        background:'var(--bg2)', borderBottom:'0.5px solid var(--border)',
        position:'sticky', top:0, zIndex:100,
      }}>
        <Link to="/" style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:22, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, letterSpacing:'.04em' }}>
            WC<span style={{ color:'var(--accent)' }}>2026</span>
          </span>
          {!isMobile && (
            <span style={{ fontSize:11, color:'var(--txt2)', fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', marginTop:2 }}>Intelligence</span>
          )}
        </Link>

        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => setDarkMode(d => !d)} style={{
            fontSize:16, padding:'5px 9px', borderRadius:'var(--r)',
            background:'var(--bg3)', border:'0.5px solid var(--border2)',
            color:'var(--txt2)', cursor:'pointer', lineHeight:1,
          }}>
            {darkMode ? '☀' : '🌙'}
          </button>

          {!isMobile && (
            <nav style={{ display:'flex', gap:2 }}>
              {nav.map(n => (
                <Link key={n.to} to={n.to} style={{
                  padding:'6px 14px', borderRadius:'var(--r)',
                  fontSize:13, fontWeight:600,
                  color: loc.pathname===n.to ? 'var(--accent)' : 'var(--txt2)',
                  background: loc.pathname===n.to ? 'rgba(200,160,0,.10)' : 'transparent',
                }}>{n.label}</Link>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main style={{ flex:1, padding: isMobile ? '14px 12px' : '20px 24px', maxWidth:1200, width:'100%', margin:'0 auto' }}>
        {children}
      </main>

      <footer style={{
        textAlign:'center', padding:'12px',
        fontSize:11, color:'var(--txt3)',
        borderTop:'0.5px solid var(--border)',
        background:'var(--bg2)',
      }}>
        <Link to="/privacy" style={{ color:'var(--txt3)' }}>Privacy Policy</Link>
        {' · '}
        <span>© 2026 WC2026 Intelligence</span>
      </footer>

      {isMobile && (
        <nav style={{
          display:'flex', borderTop:'0.5px solid var(--border)',
          background:'var(--bg2)', position:'sticky', bottom:0, zIndex:100,
        }}>
          {nav.map(n => (
            <Link key={n.to} to={n.to} style={{
              flex:1, display:'flex', flexDirection:'column', alignItems:'center',
              padding:'8px 0 10px', gap:3,
              color: loc.pathname===n.to ? 'var(--accent)' : 'var(--txt3)',
              fontSize:10, fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase',
            }}>
              <NavIcon route={n.to} active={loc.pathname===n.to} />
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}

function NavIcon({ route, active }) {
  const c = active ? 'var(--accent)' : 'var(--txt3)'
  if (route==='/')         return <svg width="20" height="20" fill="none" stroke={c} strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/></svg>
  if (route==='/fixtures') return <svg width="20" height="20" fill="none" stroke={c} strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
  if (route==='/groups')   return <svg width="20" height="20" fill="none" stroke={c} strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
  if (route==='/rankings') return <svg width="20" height="20" fill="none" stroke={c} strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
  return null
}

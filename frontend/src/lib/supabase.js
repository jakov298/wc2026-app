import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

// These get replaced with your real values from .env
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// Backend API base
const API = import.meta.env.VITE_API_URL || '/api'

export const api = {
  // Fetch all results stored in Supabase
  async getResults() {
    const { data, error } = await supabase
      .from('results')
      .select('*')
      .order('played_at', { ascending: true })
    if (error) throw error
    return data || []
  },

  // Fetch live fixtures from backend (which polls API-Football)
  async getLiveFixtures() {
    const res = await axios.get(`${API}/fixtures/live`)
    return res.data
  },

  // Fetch today's fixtures
  async getTodayFixtures() {
    const res = await axios.get(`${API}/fixtures/today`)
    return res.data
  },

  // Get AI analysis for a specific match
  async getMatchAnalysis(fixtureId, context) {
    const res = await axios.post(`${API}/analysis/${fixtureId}`, context)
    return res.data
  },

  // Get cached analysis if it exists
  async getCachedAnalysis(fixtureId) {
    const { data } = await supabase
      .from('analyses')
      .select('*')
      .eq('fixture_id', fixtureId)
      .single()
    return data
  },

  // Save a result (for manual entry fallback)
  async saveResult(result) {
    const { data, error } = await supabase
      .from('results')
      .upsert(result, { onConflict: 'fixture_id' })
    if (error) throw error
    return data
  },

  // Get power rankings (computed server-side, cached in Supabase)
  async getPowerRankings() {
    const { data } = await supabase
      .from('power_rankings')
      .select('*')
      .order('power_score', { ascending: false })
    return data || []
  }
}

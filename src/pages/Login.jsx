import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { BookOpen, Eye, EyeOff, Lock, Mail, WifiOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { currentUser, isLoading } = useAuth()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  const from = location.state?.from?.pathname || '/'

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && currentUser) navigate(from, { replace: true })
  }, [currentUser, isLoading, from, navigate])

  // Track online status
  useEffect(() => {
    const online  = () => setIsOnline(true)
    const offline = () => setIsOnline(false)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!isOnline) { setError('You are offline. Please connect to the internet to log in.'); return }
    setLoading(true)
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      if (data.session) navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2440] via-[#1a3a5c] to-[#0f2440] flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'radial-gradient(circle at 25% 25%, #d97706 0%, transparent 50%), radial-gradient(circle at 75% 75%, #d97706 0%, transparent 50%)'
      }} />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header banner */}
          <div className="bg-[#1a3a5c] px-8 py-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#d97706] flex items-center justify-center mx-auto mb-4 shadow-lg">
              <BookOpen size={28} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">JNV Haridwar</h1>
            <p className="text-white/60 text-sm mt-1">Attendance Management System</p>
            <p className="text-white/40 text-xs mt-0.5">Jawahar Navodaya Vidyalaya, Haridwar</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            {/* Offline notice */}
            {!isOnline && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 text-xs text-red-700">
                <WifiOff size={13} />
                You are offline. Login requires internet connection.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@jnvharidwar.ac.in"
                    className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c] transition-colors"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c] transition-colors"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                id="login-btn"
                type="submit"
                disabled={loading || !isOnline}
                className="w-full bg-[#1a3a5c] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#0f2440] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-6">
              NVS · Jawahar Navodaya Vidyalaya · Haridwar<br />
              Contact your administrator to reset your password.
            </p>
          </div>
        </div>

        {/* Version */}
        <p className="text-center text-white/20 text-xs mt-4">v1.0.0 · Phase 8 — Final Build</p>
      </div>
    </div>
  )
}

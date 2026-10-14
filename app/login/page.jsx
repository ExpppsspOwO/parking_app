'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    // ตรวจสอบ Username และ Password ในตาราง USERS
    const { data: user, error } = await supabase
      .from('USERS')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single()

    if (error || !user) {
      setErrorMsg('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
      setLoading(false)
      return
    }

    // บันทึก Session ลง LocalStorage แบบง่าย
    localStorage.setItem('currentUser', JSON.stringify(user))
    alert(`ยินดีต้อนรับ ${user.username} (${user.role})`)
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 text-[#0F172A]">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-8 shadow-xl">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-[#52B762]">KMUTNB Parking</h1>
          <p className="text-xs text-slate-400 mt-1">เข้าสู่ระบบจองที่จอดรถ</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">ชื่อผู้ใช้ (Username)</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl px-4 text-xs font-medium focus:outline-none focus:border-slate-400"
              placeholder="กรอกชื่อผู้ใช้"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">รหัสผ่าน (Password)</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl px-4 text-xs font-medium focus:outline-none focus:border-slate-400"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#52B762] hover:bg-[#439E51] text-white font-medium text-xs rounded-xl transition-all shadow-xs disabled:opacity-50"
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <p className="text-xs text-center text-slate-400 mt-6">
          ยังไม่มีบัญชี?{' '}
          <Link href="/register" className="text-[#52B762] font-semibold hover:underline">
            สมัครสมาชิก
          </Link>
        </p>
      </div>
    </div>
  )
}
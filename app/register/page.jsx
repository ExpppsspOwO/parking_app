'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    // ตรวจสอบข้อมูลซ้ำ
    const { data: existingUser } = await supabase
      .from('USERS')
      .select('username')
      .eq('username', username)
      .single()

    if (existingUser) {
      setErrorMsg('ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว')
      setLoading(false)
      return
    }

    // บันทึกผู้ใช้ใหม่ลงตาราง USERS
    const { error } = await supabase.from('USERS').insert([
      {
        username,
        password, // ในระบบจริงควรส่งเข้า API เพื่อ Hash ก่อนบันทึก
        phone,
        role: 'USER'
      }
    ])

    if (error) {
      setErrorMsg(error.message)
    } else {
      alert('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ')
      router.push('/login')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 text-[#0F172A]">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-8 shadow-xl">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-[#52B762]">KMUTNB Parking</h1>
          <p className="text-xs text-slate-400 mt-1">สมัครสมาชิกเข้าใช้งานระบบจองที่จอดรถ</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">ชื่อผู้ใช้ (Username) *</label>
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
            <label className="text-xs font-medium text-slate-600 block mb-1">เบอร์โทรศัพท์ *</label>
            <input
              type="tel"
              required
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl px-4 text-xs font-medium focus:outline-none focus:border-slate-400"
              placeholder="เช่น 0812345678"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">รหัสผ่าน (Password) *</label>
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
            {loading ? 'กำลังลงทะเบียน...' : 'สมัครสมาชิก'}
          </button>
        </form>

        <p className="text-xs text-center text-slate-400 mt-6">
          มีบัญชีอยู่แล้ว?{' '}
          <Link href="/login" className="text-[#52B762] font-semibold hover:underline">
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </div>
  )
}
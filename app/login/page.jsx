'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

export default function AuthPage() {
  const router = useRouter()
  
  // State สลับหน้า (true = Login, false = Register)
  const [isLogin, setIsLogin] = useState(true)

  // Form State
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // ฟังก์ชันสลับโหมด พร้อมล้างค่า Alert & Form
  const switchMode = (modeIsLogin) => {
    setIsLogin(modeIsLogin)
    setErrorMsg('')
    setSuccessMsg('')
    setUsername('')
    setPassword('')
    setPhone('')
  }

  // --- เข้าสู่ระบบ ---
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single()

    if (error || !user) {
      setErrorMsg('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
      setLoading(false)
      return
    }

    localStorage.setItem('currentUser', JSON.stringify(user))
    router.push('/')
  }

  // --- สมัครสมาชิก ---
  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    // เช็คชื่อผู้ใช้ซ้ำ
    const { data: existingUser } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single()

    if (existingUser) {
      setErrorMsg('ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว')
      setLoading(false)
      return
    }

    // บันทึกผู้ใช้ใหม่
    const { error } = await supabase.from('users').insert([
      {
        username,
        password,
        phone,
        role: 'USER'
      }
    ])

    if (error) {
      setErrorMsg(error.message)
    } else {
      setSuccessMsg('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ')
      setTimeout(() => {
        switchMode(true) // สลับกลับไปหน้าล็อกอินอัตโนมัติ
      }, 1200)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 text-[#0F172A]">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

      <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-8 shadow-xl relative overflow-hidden transition-all duration-300">
        
        {/* BRANDING */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-[#52B762] text-white rounded-2xl flex items-center justify-center text-2xl shadow-xs mx-auto mb-3">
            <i className="fa-solid fa-square-parking"></i>
          </div>
          <h1 className="text-xl font-bold text-[#52B762]">KMUTNB Parking</h1>
          <p className="text-xs text-slate-400 mt-0.5">ระบบจัดการที่จอดรถอาคาร FITM</p>
        </div>

        {/* TOGGLE TAB SWITCHER (มี Animation เลื่อนแถบไฮไลต์) */}
        <div className="bg-slate-100 p-1.5 rounded-2xl flex relative mb-6 border border-slate-200">
          <div
            className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm transition-all duration-300 ease-in-out ${
              isLogin ? 'left-1.5' : 'left-[calc(50%+3px)]'
            }`}
          />
          <button
            type="button"
            onClick={() => switchMode(true)}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl z-10 transition-colors duration-200 ${
              isLogin ? 'text-[#0F172A]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <i className="fa-solid fa-right-to-bracket mr-1.5"></i>
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            onClick={() => switchMode(false)}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl z-10 transition-colors duration-200 ${
              !isLogin ? 'text-[#0F172A]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <i className="fa-solid fa-user-plus mr-1.5"></i>
            สมัครสมาชิก
          </button>
        </div>

        {/* ERROR / SUCCESS ALERTS */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl text-center font-medium animate-fadeIn">
            <i className="fa-solid fa-circle-exclamation mr-1"></i> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl text-center font-medium animate-fadeIn">
            <i className="fa-solid fa-circle-check mr-1"></i> {successMsg}
          </div>
        )}

        {/* CONTAINER ฟอร์มที่มี Animation จาง/เลื่อนนุ่มๆ */}
        <div className="relative">
          {/* ================= FORM 1: LOGIN ================= */}
          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4 transition-all duration-300 animate-fadeIn">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">ชื่อผู้ใช้ (Username)</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl px-4 text-xs font-medium focus:outline-none focus:border-[#52B762] transition-colors"
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
                  className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl px-4 text-xs font-medium focus:outline-none focus:border-[#52B762] transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#52B762] hover:bg-[#439E51] text-white font-medium text-xs rounded-xl transition-all shadow-xs disabled:opacity-50 mt-2"
              >
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </button>
            </form>
          ) : (
            /* ================= FORM 2: REGISTER ================= */
            <form onSubmit={handleRegister} className="space-y-4 transition-all duration-300 animate-fadeIn">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">ชื่อผู้ใช้ (Username) *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl px-4 text-xs font-medium focus:outline-none focus:border-[#52B762] transition-colors"
                  placeholder="ตั้งชื่อผู้ใช้"
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
                  className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl px-4 text-xs font-medium focus:outline-none focus:border-[#52B762] transition-colors"
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
                  className="w-full bg-slate-50 border border-slate-200 h-11 rounded-xl px-4 text-xs font-medium focus:outline-none focus:border-[#52B762] transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#52B762] hover:bg-[#439E51] text-white font-medium text-xs rounded-xl transition-all shadow-xs disabled:opacity-50 mt-2"
              >
                {loading ? 'กำลังลงทะเบียน...' : 'ยืนยันการสมัครสมาชิก'}
              </button>
            </form>
          )}
        </div>

        {/* BACK TO HOME LINK */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center gap-1.5">
            <i className="fa-solid fa-arrow-left text-[10px]"></i> กลับสู่หน้าหลัก
          </Link>
        </div>

      </div>
    </div>
  )
}
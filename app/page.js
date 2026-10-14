'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

export default function HomePage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [activeTab, setActiveTab] = useState('booking') // 'booking', 'ticket', 'admin'
  const [slots, setSlots] = useState([])
  const [rate, setRate] = useState({ first_hour_rate: 50, next_hour_rate: 30 })
  const [selectedSlot, setSelectedSlot] = useState(null)

  // Booking Form State
  const [licensePlate, setLicensePlate] = useState('')
  const [phone, setPhone] = useState('')
  const [hoursToPark, setHoursToPark] = useState(1)
  const [calculatedPrice, setCalculatedPrice] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Ticket Search State
  const [searchPlate, setSearchPlate] = useState('')
  const [ticketResult, setTicketResult] = useState(null)

  // Admin CRUD State
  const [newSlotId, setNewSlotId] = useState('')
  const [newFloorNo, setNewFloorNo] = useState('1')
  const [newZoneCode, setNewZoneCode] = useState('A')

  useEffect(() => {
    // โหลดข้อมูล Session ผู้ใช้
    const userStr = localStorage.getItem('currentUser')
    if (userStr) {
      const u = JSON.parse(userStr)
      setCurrentUser(u)
      if (u.phone) setPhone(u.phone)
    }

    fetchSlots()
    fetchPricingRate()
  }, [])

  // คำนวณราคาทันทีเมื่อชั่วโมงเปลี่ยน
  useEffect(() => {
    if (hoursToPark <= 1) {
      setCalculatedPrice(Number(rate.first_hour_rate))
    } else {
      const extraHours = hoursToPark - 1
      const total = Number(rate.first_hour_rate) + (extraHours * Number(rate.next_hour_rate))
      setCalculatedPrice(total)
    }
  }, [hoursToPark, rate])

  const fetchSlots = async () => {
    const { data } = await supabase.from('parking_slots').select('*').order('slot_id', { ascending: true })
    if (data) setSlots(data)
  }

  const fetchPricingRate = async () => {
    const { data } = await supabase.from('pricing_rates').select('*').limit(1).single()
    if (data) setRate(data)
  }

  const handleBookingConfirm = async () => {
    if (!currentUser) {
      alert('กรุณาเข้าสู่ระบบก่อนทำการจอง')
      router.push('/login')
      return
    }
    if (!licensePlate || !phone || !selectedSlot) return

    const ticketId = `TK-${Date.now()}-${selectedSlot.slot_id}`
    const entryTime = new Date()
    const exitTime = new Date(entryTime.getTime() + hoursToPark * 60 * 60 * 1000)

    // บันทึกรายการจอง
    const { error: txError } = await supabase.from('parking_transactions').insert([{
      ticket_id: ticketId,
      user_id: currentUser.user_id,
      slot_id: selectedSlot.slot_id,
      rate_id: rate.rate_id || 1,
      license_plate: licensePlate.toUpperCase(),
      entry_time: entryTime.toISOString(),
      expected_exit: exitTime.toISOString(),
      prepaid_amount: calculatedPrice,
      grand_total: calculatedPrice
    }])

    if (txError) {
      alert('เกิดข้อผิดพลาดในการจอง: ' + txError.message)
      return
    }

    // อัปเดตสถานะช่องจอดเป็น OCCUPIED
    await supabase.from('parking_slots')
      .update({ status: 'OCCUPIED' })
      .eq('slot_id', selectedSlot.slot_id)

    alert('จองสำเร็จแล้ว!')
    setIsModalOpen(false)
    setSelectedSlot(null)
    setLicensePlate('')
    fetchSlots()

    // ค้นหาตั๋วที่เพิ่งสร้างเพื่อแสดงผล
    handleSearchTicket(licensePlate.toUpperCase())
    setActiveTab('ticket')
  }

  const handleSearchTicket = async (plateToSearch) => {
    const query = plateToSearch || searchPlate
    if (!query) return

    const { data, error } = await supabase
      .from('parking_transactions')
      .select('*, parking_slots(*)')
      .eq('license_plate', query.toUpperCase())
      .order('entry_time', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      setTicketResult(null)
      alert('ไม่พบข้อมูลตั๋วสำหรับป้ายทะเบียนนี้')
    } else {
      setTicketResult(data)
    }
  }

  // Admin CRUD Functions
  const handleAddSlot = async () => {
    if (!newSlotId) return
    const { error } = await supabase.from('parking_slots').insert([{
      slot_id: newSlotId.toUpperCase(),
      floor_no: newFloorNo,
      zone_code: newZoneCode.toUpperCase(),
      status: 'AVAILABLE'
    }])

    if (error) alert('Error: ' + error.message)
    else {
      setNewSlotId('')
      fetchSlots()
    }
  }

  const handleUpdateSlotStatus = async (slot_id, newStatus) => {
    await supabase.from('parking_slots').update({ status: newStatus }).eq('slot_id', slot_id)
    fetchSlots()
  }

  const handleDeleteSlot = async (slot_id) => {
    if (confirm(`ยืนยันการลบช่องจอด ${slot_id}?`)) {
      await supabase.from('parking_slots').delete().eq('slot_id', slot_id)
      fetchSlots()
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    setCurrentUser(null)
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start p-4 md:p-8 text-[#0F172A]">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

      {/* HEADER BAR */}
      <header className="w-full max-w-6xl bg-white border border-slate-200 rounded-2xl p-4 mb-6 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#52B762] text-white rounded-xl flex items-center justify-center text-xl">
            <i className="fa-solid fa-square-parking"></i>
          </div>
          <div>
            <h1 className="text-base font-bold text-[#52B762]">KMUTNB Parking System</h1>
            <p className="text-xs text-slate-400">ระบบจัดการที่จอดรถอัตโนมัติ</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium bg-slate-100 px-3 py-1.5 rounded-xl border">
                👤 {currentUser.username} ({currentUser.role})
              </span>
              <button onClick={handleLogout} className="text-xs text-rose-500 hover:underline">
                ออกจากระบบ
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => router.push('/login')} className="px-4 py-2 bg-[#52B762] text-white text-xs font-medium rounded-xl">
                เข้าสู่ระบบ
              </button>
              <button onClick={() => router.push('/login')} className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-medium rounded-xl">
                สมัครสมาชิก
              </button>
            </div>
          )}
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <div className="w-full max-w-6xl flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('booking')}
          className={`flex-1 py-3 text-xs font-medium rounded-xl border transition-all ${
            activeTab === 'booking' ? 'bg-[#52B762] text-white border-[#52B762]' : 'bg-white text-slate-600'
          }`}
        >
          <i className="fa-solid fa-car mr-2"></i> จองที่จอดรถ (Real-time)
        </button>
        <button
          onClick={() => setActiveTab('ticket')}
          className={`flex-1 py-3 text-xs font-medium rounded-xl border transition-all ${
            activeTab === 'ticket' ? 'bg-[#52B762] text-white border-[#52B762]' : 'bg-white text-slate-600'
          }`}
        >
          <i className="fa-solid fa-receipt mr-2"></i> ค้นหาตั๋ว / สถานะ
        </button>
        {currentUser?.role === 'ADMIN' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex-1 py-3 text-xs font-medium rounded-xl border transition-all ${
              activeTab === 'admin' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600'
            }`}
          >
            <i className="fa-solid fa-user-shield mr-2"></i> แผงควบคุม Admin
          </button>
        )}
      </div>

      {/* CONTENT AREA */}
      <main className="w-full max-w-6xl">
        {/* TAB 1: BOOKING */}
        {activeTab === 'booking' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div>
                <h2 className="text-base font-semibold">ผังช่องจอดรถแบบ Real-time</h2>
                <p className="text-xs text-slate-400">อัตราค่าบริการ: ชั่วโมงแรก {rate.first_hour_rate} บาท / ชั่วโมงถัดไป {rate.next_hour_rate} บาท</p>
              </div>
              <span className="text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full">
                ว่าง {slots.filter(s => s.status === 'AVAILABLE').length} / {slots.length} ช่อง
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              {slots.map((s) => {
                const isAvail = s.status === 'AVAILABLE'
                const isSelected = selectedSlot?.slot_id === s.slot_id
                return (
                  <button
                    key={s.slot_id}
                    disabled={!isAvail}
                    onClick={() => setSelectedSlot(s)}
                    className={`h-24 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                      !isAvail
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        : isSelected
                        ? 'bg-[#52B762] text-white border-[#52B762] ring-2 ring-emerald-400'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span className="text-sm font-mono font-bold">{s.slot_id}</span>
                    <span className="text-[10px] mt-1 font-medium">
                      {s.status === 'AVAILABLE' ? 'ว่าง' : s.status === 'OCCUPIED' ? 'ไม่ว่าง' : 'ปิดใช้งาน'}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border">
              <span className="text-xs font-medium">
                ช่องจอดที่เลือก: {selectedSlot ? <span className="font-bold text-[#52B762]">{selectedSlot.slot_id}</span> : 'กรุณาเลือกช่องจอดว่าง'}
              </span>
              <button
                disabled={!selectedSlot}
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-2.5 bg-[#52B762] hover:bg-[#439E51] text-white text-xs font-medium rounded-xl disabled:opacity-50"
              >
                ดำเนินการจอง
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: TICKET SEARCH (NO QR CODE) */}
        {activeTab === 'ticket' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs max-w-xl mx-auto">
            <h2 className="text-base font-semibold mb-2">ค้นหาตั๋วด้วยป้ายทะเบียน</h2>
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={searchPlate}
                onChange={(e) => setSearchPlate(e.target.value)}
                placeholder="เช่น 1กข 1234"
                className="flex-1 bg-slate-50 border h-11 rounded-xl px-4 text-xs font-medium uppercase"
              />
              <button onClick={() => handleSearchTicket()} className="px-6 bg-[#52B762] text-white text-xs font-medium rounded-xl">
                ค้นหา
              </button>
            </div>

            {ticketResult && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center shadow-xs">
                <span className="text-xs text-slate-400 block mb-1">บัตรยืนยันการจองที่จอดรถ</span>
                <h3 className="text-2xl font-bold text-slate-800 mb-4 tracking-wide">{ticketResult.license_plate}</h3>
                
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2 mb-4 text-left">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-400">ตำแหน่งช่องจอด:</span>
                    <span className="font-bold text-[#52B762] text-sm">{ticketResult.slot_id}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-400">ยอดชำระสุทธิ:</span>
                    <span className="font-semibold text-slate-800">{ticketResult.grand_total} บาท</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-400">เวลาที่บันทึกเข้า:</span>
                    <span className="font-medium text-slate-700">{new Date(ticketResult.entry_time).toLocaleString('th-TH')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">รหัสบัตรจอง (Ticket ID):</span>
                    <span className="font-mono font-semibold text-slate-800">{ticketResult.ticket_id}</span>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs font-medium">
                  ✓ ยืนยันข้อมูลการจองเรียบร้อย สามารถนำป้ายทะเบียนหรือรหัสบัตรแจ้งเจ้าหน้าที่ได้ทันที
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ADMIN DASHBOARD & CRUD */}
        {activeTab === 'admin' && currentUser?.role === 'ADMIN' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-4 border rounded-2xl text-center">
                <span className="text-xs text-slate-400">ช่องจอดทั้งหมด</span>
                <p className="text-xl font-bold">{slots.length}</p>
              </div>
              <div className="bg-white p-4 border rounded-2xl text-center">
                <span className="text-xs text-slate-400">ว่าง</span>
                <p className="text-xl font-bold text-[#52B762]">{slots.filter(s => s.status === 'AVAILABLE').length}</p>
              </div>
              <div className="bg-white p-4 border rounded-2xl text-center">
                <span className="text-xs text-slate-400">ไม่ว่าง / ปิดใช้งาน</span>
                <p className="text-xl font-bold text-rose-500">{slots.filter(s => s.status !== 'AVAILABLE').length}</p>
              </div>
            </div>

            {/* เพิ่มช่องจอด */}
            <div className="bg-white border rounded-2xl p-4">
              <h3 className="text-xs font-semibold mb-3">เพิ่มช่องจอดใหม่</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="รหัสช่อง เช่น A7"
                  value={newSlotId}
                  onChange={(e) => setNewSlotId(e.target.value)}
                  className="bg-slate-50 border h-10 rounded-xl px-3 text-xs uppercase"
                />
                <button onClick={handleAddSlot} className="px-4 bg-[#52B762] text-white text-xs rounded-xl font-medium">
                  + เพิ่มช่อง
                </button>
              </div>
            </div>

            {/* ตารางจัดการช่องจอด */}
            <div className="bg-white border rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-3">รหัสช่อง</th>
                    <th className="p-3">ชั้น / โซน</th>
                    <th className="p-3">สถานะ</th>
                    <th className="p-3 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {slots.map((s) => (
                    <tr key={s.slot_id}>
                      <td className="p-3 font-mono font-bold">{s.slot_id}</td>
                      <td className="p-3">ชั้น {s.floor_no} (Zone {s.zone_code})</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          s.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => handleUpdateSlotStatus(s.slot_id, s.status === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE')}
                          className="px-2 py-1 bg-slate-100 border rounded-lg text-[10px]"
                        >
                          สลับสถานะ
                        </button>
                        <button
                          onClick={() => handleDeleteSlot(s.slot_id)}
                          className="px-2 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-[10px]"
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL CONFIRM BOOKING */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border w-full max-w-sm rounded-3xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold">ยืนยันการจองช่อง {selectedSlot?.slot_id}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400">✕</button>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">ทะเบียนรถ *</label>
                <input
                  type="text"
                  required
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="เช่น 1กข 1234"
                  className="w-full bg-slate-50 border h-10 rounded-xl px-3 text-xs uppercase"
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
                  placeholder="เช่น 0812345678"
                  className="w-full bg-slate-50 border h-10 rounded-xl px-3 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">ระยะเวลาจอด (ชั่วโมง)</label>
                <input
                  type="number"
                  min={1}
                  value={hoursToPark}
                  onChange={(e) => setHoursToPark(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-50 border h-10 rounded-xl px-3 text-xs"
                />
              </div>

              <div className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center text-xs">
                <span>ราคารวมทั้งสิ้น:</span>
                <span className="font-bold text-[#52B762] text-sm">{calculatedPrice} บาท</span>
              </div>
            </div>

            <button
              onClick={handleBookingConfirm}
              className="w-full h-11 bg-[#52B762] hover:bg-[#439E51] text-white text-xs font-medium rounded-xl"
            >
              ยืนยันการจองและออกตั๋ว
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
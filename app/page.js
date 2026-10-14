'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

export default function HomePage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [activeTab, setActiveTab] = useState('booking') // 'booking', 'status', 'admin'

  // Data States
  const [slots, setSlots] = useState([])
  const [rate, setRate] = useState({ rate_id: 1, first_hour_rate: 20, next_hour_rate: 20, fine_rate: 50 })
  const [selectedSlot, setSelectedSlot] = useState(null)

  // Booking Form State
  const [licensePlate, setLicensePlate] = useState('')
  const [phone, setPhone] = useState('')
  const [hoursToPark, setHoursToPark] = useState(1)
  const [calculatedPrice, setCalculatedPrice] = useState(0)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)

  // Ticket Status State
  const [searchPlate, setSearchPlate] = useState('')
  const [activeTicket, setActiveTicket] = useState(null)
  const [remainingTimeText, setRemainingTimeText] = useState('')

  // Admin Bulk Create State
  const [adminFloor, setAdminFloor] = useState('1')
  const [adminZone, setAdminZone] = useState('A')
  const [bulkCount, setBulkCount] = useState(10)

  // Admin Pricing State
  const [inputFirstRate, setInputFirstRate] = useState(20)
  const [inputNextRate, setInputNextRate] = useState(20)
  const [inputFineRate, setInputFineRate] = useState(50)
  const [isUpdatingRate, setIsUpdatingRate] = useState(false)

  // Admin Checkbox Select State
  const [selectedSlotIds, setSelectedSlotIds] = useState([])

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser')
    if (userStr) {
      const u = JSON.parse(userStr)
      setCurrentUser(u)
      if (u.phone) setPhone(u.phone)
    }

    fetchSlots()
    fetchPricingRate()
  }, [])

  // คำนวณราคาตามชั่วโมง
  useEffect(() => {
    if (hoursToPark <= 1) {
      setCalculatedPrice(Number(rate.first_hour_rate || 20))
    } else {
      const extraHours = hoursToPark - 1
      const total = Number(rate.first_hour_rate || 20) + (extraHours * Number(rate.next_hour_rate || 20))
      setCalculatedPrice(total)
    }
  }, [hoursToPark, rate])

  // นับเวลาถอยหลัง Real-time
  useEffect(() => {
    if (!activeTicket || !activeTicket.expected_exit) return

    const timer = setInterval(() => {
      const now = new Date().getTime()
      const exit = new Date(activeTicket.expected_exit).getTime()
      const diff = exit - now

      if (diff <= 0) {
        setRemainingTimeText('หมดเวลาจอดแล้ว (เกินเวลาจอด)')
      } else {
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        setRemainingTimeText(`${hours} ชั่วโมง ${minutes} นาที ${seconds} วินาที`)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [activeTicket])

  // ดึงข้อมูลช่องจอด + Natural Sort
  const fetchSlots = async () => {
    const { data, error } = await supabase.from('parking_slots').select('*')
    if (data) {
      const sortedData = data.sort((a, b) =>
        a.slot_id.localeCompare(b.slot_id, undefined, { numeric: true, sensitivity: 'base' })
      )
      setSlots(sortedData)
    }
    if (error) console.error('Error fetching slots:', error)
  }

  // ดึงเรทราคา
  const fetchPricingRate = async () => {
    const { data } = await supabase.from('pricing_rates').select('*').limit(1).single()
    if (data) {
      setRate(data)
      setInputFirstRate(data.first_hour_rate || 20)
      setInputNextRate(data.next_hour_rate || 20)
      setInputFineRate(data.fine_rate || 50)
    }
  }

  // อัปเดตราคา
  const handleUpdatePricing = async (e) => {
    e.preventDefault()
    setIsUpdatingRate(true)

    const { error } = await supabase
      .from('pricing_rates')
      .update({
        first_hour_rate: Number(inputFirstRate),
        next_hour_rate: Number(inputNextRate),
        fine_rate: Number(inputFineRate)
      })
      .eq('rate_id', rate.rate_id || 1)

    if (error) {
      alert('เกิดข้อผิดพลาดในการตั้งค่าราคา: ' + error.message)
    } else {
      alert('บันทึกอัตราค่าบริการและค่าปรับใหม่เรียบร้อยแล้ว!')
      fetchPricingRate()
    }
    setIsUpdatingRate(false)
  }

  // ยืนยันการจอง
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
      alert('เกิดข้อผิดพลาดในการบันทึกการจอง: ' + txError.message)
      return
    }

    await supabase.from('parking_slots')
      .update({ status: 'OCCUPIED' })
      .eq('slot_id', selectedSlot.slot_id)

    alert('ชำระเงินและยืนยันการจองสำเร็จ!')
    setIsBookingModalOpen(false)
    fetchSlots()

    handleSearchTicket(licensePlate.toUpperCase())
    setActiveTab('status')
    
    setSelectedSlot(null)
    setLicensePlate('')
  }

  // ค้นหาตั๋ว
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
      setActiveTicket(null)
      alert('ไม่พบข้อมูลการจองสำหรับป้ายทะเบียนนี้')
    } else {
      setActiveTicket(data)
    }
  }

  // สร้างช่องจอดรวดเดียว (ใส่เลขชั้นนำหน้า เช่น 1A1, 1A2... เพื่อไม่ให้ slot_id ซ้ำกันข้ามชั้น)
  const handleBulkCreateSlots = async () => {
    if (!adminFloor || !adminZone || !bulkCount || bulkCount <= 0) {
      alert('กรุณากรอกข้อมูล ชั้น โซน และจำนวนช่องจอดให้ครบถ้วน')
      return
    }

    const newSlots = []
    const floor = adminFloor.trim()
    const prefix = adminZone.trim().toUpperCase()

    for (let i = 1; i <= parseInt(bulkCount); i++) {
      // สร้าง slot_id มีชั้นนำหน้า เช่น ชั้น 1 โซน A -> 1A1, 1A2 ...
      const uniqueSlotId = `${floor}${prefix}${i}`
      newSlots.push({
        slot_id: uniqueSlotId,
        floor_no: floor,
        zone_code: prefix,
        status: 'AVAILABLE'
      })
    }

    const { error } = await supabase
      .from('parking_slots')
      .upsert(newSlots, { onConflict: 'slot_id' })

    if (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } else {
      alert(`สร้างช่องจอด ${floor}${prefix}1 ถึง ${floor}${prefix}${bulkCount} บนชั้น ${floor} เรียบร้อยแล้ว!`)
      fetchSlots()
    }
  }

  // สลับสถานะช่องจอด
  const handleToggleSlotStatus = async (slotId, currentStatus) => {
    const nextStatus = currentStatus === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE'
    await supabase.from('parking_slots').update({ status: nextStatus }).eq('slot_id', slotId)
    fetchSlots()
  }

  // ลบช่องจอดเดี่ยว
  const handleDeleteSlot = async (slotId) => {
    if (confirm(`คุณต้องการลบช่องจอด ${slotId} ออกจากระบบใช่หรือไม่?`)) {
      await supabase.from('parking_slots').delete().eq('slot_id', slotId)
      setSelectedSlotIds(prev => prev.filter(id => id !== slotId))
      fetchSlots()
    }
  }

  // เลือก/ยกเลิก เลือกช่องจอดเดี่ยว
  const handleToggleSelectSlot = (slotId) => {
    setSelectedSlotIds(prev =>
      prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]
    )
  }

  // เลือกทั้งหมดในโซน
  const handleSelectAllInZone = (zoneSlots, isChecked) => {
    const zoneSlotIds = zoneSlots.map(s => s.slot_id)
    if (isChecked) {
      setSelectedSlotIds(prev => Array.from(new Set([...prev, ...zoneSlotIds])))
    } else {
      setSelectedSlotIds(prev => prev.filter(id => !zoneSlotIds.includes(id)))
    }
  }

  // เลือกทั้งหมดในระบบ
  const handleSelectAllGlobal = (isChecked) => {
    if (isChecked) {
      setSelectedSlotIds(slots.map(s => s.slot_id))
    } else {
      setSelectedSlotIds([])
    }
  }

  // ลบช่องจอดที่เลือกแบบกลุ่ม (Bulk Delete)
  const handleBulkDeleteSlots = async () => {
    if (selectedSlotIds.length === 0) return
    if (confirm(`ยืนยันการลบช่องจอดที่เลือกจำนวน ${selectedSlotIds.length} รายการใช่หรือไม่?`)) {
      const { error } = await supabase
        .from('parking_slots')
        .delete()
        .in('slot_id', selectedSlotIds)

      if (error) {
        alert('เกิดข้อผิดพลาดในการลบ: ' + error.message)
      } else {
        alert(`ลบช่องจอดสำเร็จแล้ว ${selectedSlotIds.length} รายการ!`)
        setSelectedSlotIds([])
        fetchSlots()
      }
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    setCurrentUser(null)
    router.push('/login')
  }

  // รายชื่อชั้นทั้งหมดที่มีในระบบ
  const uniqueFloors = Array.from(new Set(slots.map(s => s.floor_no))).sort()

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start p-4 md:p-8 text-[#0F172A]">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

      {/* HEADER NAVBAR */}
      <header className="w-full max-w-6xl bg-white border border-slate-200 rounded-2xl p-4 mb-6 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#52B762] text-white rounded-xl flex items-center justify-center text-xl">
            <i className="fa-solid fa-square-parking"></i>
          </div>
          <div>
            <h1 className="text-base font-bold text-[#52B762]">KMUTNB Parking System</h1>
            <p className="text-xs text-slate-400">อาคารจอดรถ FITM • มจพ.</p>
          </div>
        </div>

        <div>
          {currentUser ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium bg-slate-100 px-3 py-1.5 rounded-xl border">
                👤 {currentUser.username} ({currentUser.role})
              </span>
              <button onClick={handleLogout} className="text-xs text-rose-500 hover:underline font-medium">
                ออกจากระบบ
              </button>
            </div>
          ) : (
            <button onClick={() => router.push('/login')} className="px-4 py-2 bg-[#52B762] hover:bg-[#439E51] text-white text-xs font-medium rounded-xl">
              เข้าสู่ระบบ / สมัครสมาชิก
            </button>
          )}
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <div className="w-full max-w-6xl flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('booking')}
          className={`flex-1 py-3 text-xs font-semibold rounded-xl border transition-all ${
            activeTab === 'booking' ? 'bg-[#52B762] text-white border-[#52B762] shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <i className="fa-solid fa-car mr-2"></i> เลือกช่องจอดรถ (Real-time)
        </button>
        <button
          onClick={() => setActiveTab('status')}
          className={`flex-1 py-3 text-xs font-semibold rounded-xl border transition-all ${
            activeTab === 'status' ? 'bg-[#52B762] text-white border-[#52B762] shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <i className="fa-solid fa-clock mr-2"></i> ตรวจสอบสถานะการจอง
        </button>
        {currentUser?.role === 'ADMIN' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex-1 py-3 text-xs font-semibold rounded-xl border transition-all ${
              activeTab === 'admin' ? 'bg-slate-800 text-white border-slate-800 shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <i className="fa-solid fa-sliders mr-2"></i> แผงควบคุม Admin
          </button>
        )}
      </div>

      <main className="w-full max-w-6xl">
        
        {/* ==================== TAB 1: จองที่จอดรถ (ผู้ใช้งาน) ==================== */}
        {activeTab === 'booking' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">เลือกช่องจอดรถ (Pick Parking Slot)</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  อัตราค่าบริการ: ชั่วโมงแรก {rate.first_hour_rate} บาท / ชั่วโมงถัดไป {rate.next_hour_rate} บาท
                </p>
              </div>
              <span className="text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full">
                ว่าง {slots.filter(s => s.status === 'AVAILABLE').length} / {slots.length} ช่อง
              </span>
            </div>

            {uniqueFloors.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">ยังไม่มีข้อมูลช่องจอดในระบบ (ให้ Admin เพิ่มช่องจอดก่อน)</div>
            ) : (
              uniqueFloors.map(floor => {
                const floorSlots = slots.filter(s => s.floor_no === floor)
                const uniqueZones = Array.from(new Set(floorSlots.map(s => s.zone_code))).sort()

                return (
                  <div key={floor} className="mb-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <i className="fa-solid fa-layer-group text-[#52B762]"></i> ชั้น {floor}
                    </h3>
                    
                    <div className="space-y-4">
                      {uniqueZones.map(zone => {
                        const zoneSlots = floorSlots.filter(s => s.zone_code === zone)
                        return (
                          <div key={zone} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                            <h4 className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#52B762]"></span> 
                              โซน {zone} (Zone {zone})
                            </h4>

                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                              {zoneSlots.map(s => {
                                const isAvail = s.status === 'AVAILABLE'
                                const isSelected = selectedSlot?.slot_id === s.slot_id
                                return (
                                  <button
                                    key={s.slot_id}
                                    disabled={!isAvail}
                                    onClick={() => setSelectedSlot(s)}
                                    className={`h-20 rounded-xl border flex flex-col items-center justify-center transition-all ${
                                      !isAvail
                                        ? 'bg-slate-200/80 border-slate-200 text-slate-400 cursor-not-allowed'
                                        : isSelected
                                        ? 'bg-[#52B762] text-white border-[#52B762] ring-2 ring-emerald-400 shadow-xs'
                                        : 'bg-slate-50 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700'
                                    }`}
                                  >
                                    <span className="text-sm font-mono font-bold">{s.slot_id}</span>
                                    <span className="text-[10px] mt-1 font-medium">
                                      {s.status === 'AVAILABLE' ? 'ว่าง' : 'ไม่ว่าง'}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}

            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-4">
              <span className="text-xs font-medium text-slate-700">
                ตำแหน่งที่เลือก: {selectedSlot ? <span className="font-bold text-[#52B762]">ชั้น {selectedSlot.floor_no} • โซน {selectedSlot.zone_code} (ช่อง {selectedSlot.slot_id})</span> : 'กรุณาเลือกช่องจอดว่าง'}
              </span>
              <button
                disabled={!selectedSlot}
                onClick={() => setIsBookingModalOpen(true)}
                className="px-6 py-2.5 bg-[#52B762] hover:bg-[#439E51] text-white text-xs font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                ดำเนินการจอง
              </button>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: ตรวจสอบสถานะการจอง ==================== */}
        {activeTab === 'status' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs max-w-xl mx-auto">
            <h2 className="text-base font-bold text-slate-800 mb-1">ตรวจสอบสถานะการจองที่จอดรถ</h2>
            <p className="text-xs text-slate-400 mb-4">กรอกเลขป้ายทะเบียนรถเพื่อเรียกดูเวลาคงเหลือและตำแหน่งจอด</p>

            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={searchPlate}
                onChange={(e) => setSearchPlate(e.target.value)}
                placeholder="เช่น 1กข 1234"
                className="flex-1 bg-slate-50 border border-slate-200 h-11 rounded-xl px-4 text-xs font-medium uppercase focus:outline-none focus:border-[#52B762]"
              />
              <button onClick={() => handleSearchTicket()} className="px-6 bg-[#52B762] hover:bg-[#439E51] text-white text-xs font-semibold rounded-xl transition-all shadow-xs">
                ค้นหา
              </button>
            </div>

            {activeTicket ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 block">ป้ายทะเบียนรถยนต์</span>
                    <h3 className="text-xl font-bold text-slate-800">{activeTicket.license_plate}</h3>
                  </div>
                  <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
                    ✓ จองสำเร็จ
                  </span>
                </div>

                <div className="bg-[#52B762] text-white p-4 rounded-xl text-center shadow-xs">
                  <span className="text-[11px] opacity-90 block mb-1">เวลาจอดคงเหลืออยู่</span>
                  <p className="text-lg font-bold font-mono tracking-wider">{remainingTimeText || 'กำลังคำนวณ...'}</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2 text-slate-700">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-400">ตำแหน่งช่องจอด:</span>
                    <span className="font-bold text-[#52B762]">ชั้น {activeTicket.parking_slots?.floor_no || '-'} • โซน {activeTicket.parking_slots?.zone_code || '-'} (ช่อง {activeTicket.slot_id})</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-400">เวลาที่เริ่มจอด (ต้น):</span>
                    <span className="font-medium">{new Date(activeTicket.entry_time).toLocaleString('th-TH')}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-400">เวลาสิ้นสุด (ปลาย):</span>
                    <span className="font-medium">{new Date(activeTicket.expected_exit).toLocaleString('th-TH')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ยอดชำระสุทธิ:</span>
                    <span className="font-bold text-slate-900">{activeTicket.grand_total} บาท</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400">
                กรอกป้ายทะเบียนด้านบนเพื่อเช็คสถานะ
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 3: แผงควบคุม ADMIN ==================== */}
        {activeTab === 'admin' && currentUser?.role === 'ADMIN' && (
          <div className="space-y-6">
            
            {/* สรุปยอด */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-4 border rounded-2xl text-center shadow-xs">
                <span className="text-xs text-slate-400">ช่องจอดทั้งหมด</span>
                <p className="text-2xl font-bold text-slate-800">{slots.length}</p>
              </div>
              <div className="bg-white p-4 border rounded-2xl text-center shadow-xs">
                <span className="text-xs text-slate-400">สถานะว่าง</span>
                <p className="text-2xl font-bold text-[#52B762]">{slots.filter(s => s.status === 'AVAILABLE').length}</p>
              </div>
              <div className="bg-white p-4 border rounded-2xl text-center shadow-xs">
                <span className="text-xs text-slate-400">มีรถจอด / ปิดใช้งาน</span>
                <p className="text-2xl font-bold text-rose-500">{slots.filter(s => s.status !== 'AVAILABLE').length}</p>
              </div>
            </div>

            {/* ส่วนที่ 1: ตั้งค่าอัตราค่าบริการและค่าปรับ */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-1">ตั้งค่าอัตราค่าบริการและค่าปรับ (Pricing Rates)</h3>
              <p className="text-xs text-slate-400 mb-4">กำหนดอัตราค่าบริการชั่วโมงแรก ชั่วโมงถัดไป และค่าปรับกรณีจอดเกินเวลา</p>

              <form onSubmit={handleUpdatePricing} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">ชั่วโมงแรก (บาท) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={inputFirstRate}
                    onChange={(e) => setInputFirstRate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 h-10 rounded-xl px-3 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">ชั่วโมงถัดไป (บาท) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={inputNextRate}
                    onChange={(e) => setInputNextRate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 h-10 rounded-xl px-3 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">ค่าปรับเกินเวลา (บาท/ชม.) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={inputFineRate}
                    onChange={(e) => setInputFineRate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 h-10 rounded-xl px-3 text-xs font-medium"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isUpdatingRate}
                    className="w-full h-10 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50"
                  >
                    {isUpdatingRate ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าราคา'}
                  </button>
                </div>
              </form>
            </div>

            {/* ส่วนที่ 2: เครื่องมือสร้างช่องจอดแบบชุดรวดเดียว (Bulk Generation) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-1">จัดการชั้น/โซน และเพิ่มช่องจอดอัตโนมัติ</h3>
              <p className="text-xs text-slate-400 mb-4">ระบุชั้น โซน และจำนวน เช่น ชั้น 1 โซน A จำนวน 10 ช่อง ระบบจะสร้าง 1A1 - 1A10 ให้ทันที</p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">ระบุ ชั้น *</label>
                  <input
                    type="text"
                    value={adminFloor}
                    onChange={(e) => setAdminFloor(e.target.value)}
                    placeholder="เช่น 1 หรือ 2"
                    className="w-full bg-slate-50 border border-slate-200 h-10 rounded-xl px-3 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">ระบุ โซน *</label>
                  <input
                    type="text"
                    value={adminZone}
                    onChange={(e) => setAdminZone(e.target.value)}
                    placeholder="เช่น A หรือ B"
                    className="w-full bg-slate-50 border border-slate-200 h-10 rounded-xl px-3 text-xs font-medium uppercase"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">จำนวนช่องจอด *</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={bulkCount}
                    onChange={(e) => setBulkCount(e.target.value)}
                    placeholder="เช่น 10"
                    className="w-full bg-slate-50 border border-slate-200 h-10 rounded-xl px-3 text-xs font-medium"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleBulkCreateSlots}
                    className="w-full h-10 bg-[#52B762] hover:bg-[#439E51] text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
                  >
                    + สร้างช่องจอดรวดเดียว
                  </button>
                </div>
              </div>
            </div>

            {/* ส่วนที่ 3: จัดการช่องจอดแบบจัดกลุ่มเป็นบล็อกการ์ด (ชั้น -> โซน -> การ์ดช่องจอด) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">รายการช่องจอดทั้งหมด (จัดกลุ่มแยกตามชั้นและโซน)</h4>
                  <p className="text-xs text-slate-400">ติ๊กเลือกช่องจอดที่ต้องการเพื่อกดลบพร้อมกันหลายๆ ช่องได้</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={slots.length > 0 && selectedSlotIds.length === slots.length}
                      onChange={(e) => handleSelectAllGlobal(e.target.checked)}
                      className="rounded border-slate-300 text-[#52B762] focus:ring-[#52B762]"
                    />
                    เลือกทั้งหมด ({slots.length})
                  </label>

                  {selectedSlotIds.length > 0 && (
                    <button
                      onClick={handleBulkDeleteSlots}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                      ลบรายการที่เลือก ({selectedSlotIds.length})
                    </button>
                  )}
                </div>
              </div>

              {uniqueFloors.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">ยังไม่มีข้อมูลช่องจอดในระบบ</div>
              ) : (
                uniqueFloors.map(floor => {
                  const floorSlots = slots.filter(s => s.floor_no === floor)
                  const uniqueZones = Array.from(new Set(floorSlots.map(s => s.zone_code))).sort()

                  return (
                    <div key={floor} className="mb-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                      <h5 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-layer-group text-[#52B762]"></i> ชั้น {floor}
                      </h5>

                      <div className="space-y-4">
                        {uniqueZones.map(zone => {
                          const zoneSlots = floorSlots.filter(s => s.zone_code === zone)
                          const isAllZoneSelected = zoneSlots.length > 0 && zoneSlots.every(s => selectedSlotIds.includes(s.slot_id))

                          return (
                            <div key={zone} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                              <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                                <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#52B762]"></span>
                                  โซน {zone} (Zone {zone})
                                </span>
                                
                                <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer hover:text-slate-800">
                                  <input
                                    type="checkbox"
                                    checked={isAllZoneSelected}
                                    onChange={(e) => handleSelectAllInZone(zoneSlots, e.target.checked)}
                                    className="rounded border-slate-300 text-[#52B762] focus:ring-[#52B762]"
                                  />
                                  เลือกโซน {zone} ทั้งหมด ({zoneSlots.length})
                                </label>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {zoneSlots.map(s => {
                                  const isChecked = selectedSlotIds.includes(s.slot_id)
                                  return (
                                    <div
                                      key={s.slot_id}
                                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                                        isChecked
                                          ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-200'
                                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => handleToggleSelectSlot(s.slot_id)}
                                          className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                                        />
                                        <div>
                                          <span className="text-xs font-mono font-bold text-slate-800 block">{s.slot_id}</span>
                                          <span className={`text-[10px] font-semibold ${
                                            s.status === 'AVAILABLE' ? 'text-emerald-600' : 'text-rose-600'
                                          }`}>
                                            {s.status === 'AVAILABLE' ? 'ว่าง' : 'ไม่ว่าง'}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleToggleSlotStatus(s.slot_id, s.status)}
                                          className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-[10px] font-medium text-slate-600"
                                        >
                                          สลับ
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSlot(s.slot_id)}
                                          className="px-2 py-1 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg text-[10px] font-medium"
                                        >
                                          ลบ
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

          </div>
        )}

      </main>

      {/* MODAL ยืนยันการจอง + รูป QR CODE */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-3xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-800">
                ยืนยันการจองช่อง {selectedSlot?.slot_id} (ชั้น {selectedSlot?.floor_no} โซน {selectedSlot?.zone_code})
              </h3>
              <button onClick={() => setIsBookingModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">ทะเบียนรถยนต์ *</label>
                <input
                  type="text"
                  required
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="เช่น 1กข 1234"
                  className="w-full bg-slate-50 border border-slate-200 h-10 rounded-xl px-3 text-xs uppercase font-medium focus:outline-none focus:border-[#52B762]"
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
                  className="w-full bg-slate-50 border border-slate-200 h-10 rounded-xl px-3 text-xs font-medium focus:outline-none focus:border-[#52B762]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">ระยะเวลาที่ต้องการจอด (ชั่วโมง)</label>
                <input
                  type="number"
                  min={1}
                  value={hoursToPark}
                  onChange={(e) => setHoursToPark(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-50 border border-slate-200 h-10 rounded-xl px-3 text-xs font-medium focus:outline-none focus:border-[#52B762]"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">ยอดชำระสุทธิ:</span>
                <span className="font-bold text-[#52B762] text-sm">{calculatedPrice} บาท</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center mb-5">
              <span className="text-[11px] font-semibold text-slate-600 block mb-2">สแกน QR Code เพื่อชำระเงิน</span>
              <div className="w-36 h-36 bg-white border border-slate-200 rounded-xl mx-auto flex items-center justify-center overflow-hidden p-2 shadow-2xs">
                <img 
                  src="/qr-payment.png" 
                  alt="QR Code สำหรับชำระเงิน" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/150?text=Place+QR+Here';
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2">เมื่อสแกนชำระเรียบร้อยแล้ว ให้กดยืนยันด้านล่าง</p>
            </div>

            <button
              onClick={handleBookingConfirm}
              className="w-full h-11 bg-[#52B762] hover:bg-[#439E51] text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
            >
              ยืนยันการชำระเงินและออกตั๋ว
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import BookingSection from '../components/BookingSection'
import AlertModal from '../components/AlertModal'

export default function HomePage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [activeTab, setActiveTab] = useState('booking') // 'booking', 'status', 'admin'

  // Data States
  const [slots, setSlots] = useState([])
  const [rate, setRate] = useState({ rate_id: 1, first_hour_rate: 20, next_hour_rate: 20, fine_rate: 50 })
  const [selectedSlot, setSelectedSlot] = useState(null)

  // Custom Alert & Confirm Pop-up Modal State
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success' // 'success' | 'error' | 'confirm'
  })
  const [confirmCallback, setConfirmCallback] = useState(null)

  const showAlert = (message, title = 'ดำเนินการสำเร็จ', type = 'success') => {
    setAlertModal({ isOpen: true, title, message, type })
  }

  const showConfirm = (message, title = 'ยืนยันการทำรายการ', onConfirmAction) => {
    setAlertModal({ isOpen: true, title, message, type: 'confirm' })
    setConfirmCallback(() => onConfirmAction)
  }

  // Booking Floor & Zone Selector States
  const [bookingFloor, setBookingFloor] = useState('')
  const [bookingZone, setBookingZone] = useState('')

  // Booking Form State
  const [licensePlate, setLicensePlate] = useState('')
  const [phone, setPhone] = useState('')
  const [hoursToPark, setHoursToPark] = useState(1)
  const [calculatedPrice, setCalculatedPrice] = useState(0)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)

  // Ticket Status State
  const [searchPlate, setSearchPlate] = useState('')
  const [userTickets, setUserTickets] = useState([])
  const [remainingTimeText, setRemainingTimeText] = useState('')

  // Admin Floor & Zone Selector States
  const [adminManageFloor, setAdminManageFloor] = useState('')
  const [adminManageZone, setAdminManageZone] = useState('')

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

  const uniqueFloors = Array.from(new Set(slots.map(s => s.floor_no))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  
  const bookingAvailableZones = Array.from(
    new Set(slots.filter(s => s.floor_no === bookingFloor).map(s => s.zone_code))
  ).sort()

  const adminAvailableZones = Array.from(
    new Set(slots.filter(s => s.floor_no === adminManageFloor).map(s => s.zone_code))
  ).sort()

  useEffect(() => {
    if (uniqueFloors.length > 0) {
      if (!bookingFloor || !uniqueFloors.includes(bookingFloor)) setBookingFloor(uniqueFloors[0])
      if (!adminManageFloor || !uniqueFloors.includes(adminManageFloor)) setAdminManageFloor(uniqueFloors[0])
    }
  }, [uniqueFloors])

  useEffect(() => {
    if (bookingAvailableZones.length > 0) {
      if (!bookingZone || !bookingAvailableZones.includes(bookingZone)) setBookingZone(bookingAvailableZones[0])
    } else {
      setBookingZone('')
    }
  }, [bookingFloor, bookingAvailableZones])

  useEffect(() => {
    if (adminAvailableZones.length > 0) {
      if (!adminManageZone || !adminAvailableZones.includes(adminManageZone)) setAdminManageZone(adminAvailableZones[0])
    } else {
      setAdminManageZone('')
    }
  }, [adminManageFloor, adminAvailableZones])

  useEffect(() => {
    if (hoursToPark <= 1) {
      setCalculatedPrice(Number(rate.first_hour_rate || 20))
    } else {
      const extraHours = hoursToPark - 1
      const total = Number(rate.first_hour_rate || 20) + (extraHours * Number(rate.next_hour_rate || 20))
      setCalculatedPrice(total)
    }
  }, [hoursToPark, rate])

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

  const fetchPricingRate = async () => {
    const { data } = await supabase.from('pricing_rates').select('*').limit(1).single()
    if (data) {
      setRate(data)
      setInputFirstRate(data.first_hour_rate || 20)
      setInputNextRate(data.next_hour_rate || 20)
      setInputFineRate(data.fine_rate || 50)
    }
  }

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
      showAlert('เกิดข้อผิดพลาดในการตั้งค่าราคา: ' + error.message, 'เกิดข้อผิดพลาด', 'error')
    } else {
      showAlert('บันทึกอัตราค่าบริการและค่าปรับใหม่เรียบร้อยแล้ว!', 'บันทึกสำเร็จ', 'success')
      fetchPricingRate()
    }
    setIsUpdatingRate(false)
  }

  // ยืนยันการจอง (แก้เรื่อง status column ไม่พบ)
  const handleBookingConfirm = async () => {
    if (!currentUser) {
      showAlert('กรุณาเข้าสู่ระบบก่อนทำการจอง', 'แจ้งเตือน', 'error')
      router.push('/login')
      return
    }
    if (!licensePlate || !phone || !selectedSlot) return

    const ticketId = `TK-${Date.now()}-${selectedSlot.slot_id}`
    const entryTime = new Date()
    const exitTime = new Date(entryTime.getTime() + hoursToPark * 60 * 60 * 1000)

    // 1. บันทึกลง parking_transactions (ตัด status ออกเนื่องจากไม่มีใน Schema)
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
      showAlert('เกิดข้อผิดพลาดในการบันทึกการจอง: ' + txError.message, 'เกิดข้อผิดพลาด', 'error')
      return
    }

    // 2. บันทึกลง payments ตาม ER Diagram
    await supabase.from('payments').insert([{
      ticket_id: ticketId,
      amount: calculatedPrice,
      payment_method: 'QR_PROMPTPAY',
      paid_at: new Date().toISOString(),
      status: 'COMPLETED'
    }])

    // 3. ปรับสถานะช่องจอด
    await supabase.from('parking_slots')
      .update({ status: 'OCCUPIED' })
      .eq('slot_id', selectedSlot.slot_id)

    showAlert('ชำระเงินและยืนยันการจองสำเร็จ!', 'จองสำเร็จ', 'success')
    setIsBookingModalOpen(false)
    fetchSlots()

    handleSearchTicket(licensePlate.toUpperCase())
    setActiveTab('status')
    
    setSelectedSlot(null)
    setLicensePlate('')
  }

  const handleSearchTicket = async (plateToSearch) => {
    const query = plateToSearch || searchPlate

    let dbQuery = supabase
      .from('parking_transactions')
      .select('*, parking_slots(*)')
      .order('entry_time', { ascending: false })

    if (query) {
      dbQuery = dbQuery.eq('license_plate', query.toUpperCase())
    } else if (currentUser) {
      dbQuery = dbQuery.eq('user_id', currentUser.user_id)
    } else {
      showAlert('กรุณากรอกป้ายทะเบียนเพื่อค้นหา', 'แจ้งเตือน', 'error')
      return
    }

    const { data, error } = await dbQuery

    if (error || !data || data.length === 0) {
      setUserTickets([])
      showAlert('ไม่พบข้อมูลการจองสำหรับป้ายทะเบียนหรือผู้ใช้นี้', 'ไม่พบข้อมูล', 'error')
    } else {
      setUserTickets(data)
    }
  }

  const handleBulkCreateSlots = async () => {
    if (!adminFloor || !adminZone || !bulkCount || bulkCount <= 0) {
      showAlert('กรุณากรอกข้อมูล ชั้น โซน และจำนวนช่องจอดให้ครบถ้วน', 'ข้อมูลไม่ครบถ้วน', 'error')
      return
    }

    const newSlots = []
    const floor = adminFloor.trim()
    const prefix = adminZone.trim().toUpperCase()

    for (let i = 1; i <= parseInt(bulkCount); i++) {
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
      showAlert('เกิดข้อผิดพลาด: ' + error.message, 'เกิดข้อผิดพลาด', 'error')
    } else {
      showAlert(`สร้างช่องจอด ${floor}${prefix}1 ถึง ${floor}${prefix}${bulkCount} บนชั้น ${floor} เรียบร้อยแล้ว!`, 'สร้างช่องจอดสำเร็จ', 'success')
      fetchSlots()
      setAdminManageFloor(floor)
      setAdminManageZone(prefix)
    }
  }

  const handleToggleSlotStatus = async (slotId, currentStatus) => {
    let nextStatus = 'AVAILABLE'
    if (currentStatus === 'AVAILABLE') nextStatus = 'OCCUPIED'
    else if (currentStatus === 'OCCUPIED') nextStatus = 'UNAVAILABLE'
    else nextStatus = 'AVAILABLE'

    await supabase.from('parking_slots').update({ status: nextStatus }).eq('slot_id', slotId)
    fetchSlots()
  }

  // ลบช่องจอดเดี่ยว (ใช้ Custom Confirm Modal)
  const handleDeleteSlot = (slotId) => {
    showConfirm(
      `คุณต้องการลบช่องจอด ${slotId} ออกจากระบบใช่หรือไม่?`,
      'ยืนยันการลบช่องจอด',
      async () => {
        await supabase.from('parking_slots').delete().eq('slot_id', slotId)
        setSelectedSlotIds(prev => prev.filter(id => id !== slotId))
        showAlert(`ลบช่องจอด ${slotId} สำเร็จแล้ว`, 'ลบสำเร็จ', 'success')
        fetchSlots()
      }
    )
  }

  const handleToggleSelectSlot = (slotId) => {
    setSelectedSlotIds(prev =>
      prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]
    )
  }

  const handleSelectAllInCurrentZone = (currentZoneSlots, isChecked) => {
    const zoneSlotIds = currentZoneSlots.map(s => s.slot_id)
    if (isChecked) {
      setSelectedSlotIds(prev => Array.from(new Set([...prev, ...zoneSlotIds])))
    } else {
      setSelectedSlotIds(prev => prev.filter(id => !zoneSlotIds.includes(id)))
    }
  }

  // เปลี่ยนสถานะหลายช่องจอด (ใช้ Custom Confirm Modal)
  const handleBulkUpdateStatus = (newStatus) => {
    if (selectedSlotIds.length === 0) return

    const statusLabel = 
      newStatus === 'AVAILABLE' ? 'ว่าง' : 
      newStatus === 'OCCUPIED' ? 'ไม่ว่าง' : 'ไม่พร้อมใช้งาน'

    showConfirm(
      `คุณต้องการเปลี่ยนสถานะช่องจอดที่เลือกจำนวน ${selectedSlotIds.length} รายการ เป็น "${statusLabel}" ใช่หรือไม่?`,
      'ยืนยันการเปลี่ยนสถานะ',
      async () => {
        const { error } = await supabase
          .from('parking_slots')
          .update({ status: newStatus })
          .in('slot_id', selectedSlotIds)

        if (error) {
          showAlert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ: ' + error.message, 'เกิดข้อผิดพลาด', 'error')
        } else {
          showAlert(`เปลี่ยนสถานะช่องจอด ${selectedSlotIds.length} รายการเป็น "${statusLabel}" สำเร็จ!`, 'เปลี่ยนสถานะสำเร็จ', 'success')
          setSelectedSlotIds([])
          fetchSlots()
        }
      }
    )
  }

  // ลบหลายช่องจอด (ใช้ Custom Confirm Modal)
  const handleBulkDeleteSlots = () => {
    if (selectedSlotIds.length === 0) return

    showConfirm(
      `ยืนยันการลบช่องจอดที่เลือกจำนวน ${selectedSlotIds.length} รายการใช่หรือไม่?`,
      'ยืนยันการลบช่องจอดหลายรายการ',
      async () => {
        const { error } = await supabase
          .from('parking_slots')
          .delete()
          .in('slot_id', selectedSlotIds)

        if (error) {
          showAlert('เกิดข้อผิดพลาดในการลบ: ' + error.message, 'เกิดข้อผิดพลาด', 'error')
        } else {
          showAlert(`ลบช่องจอดสำเร็จแล้ว ${selectedSlotIds.length} รายการ!`, 'ลบสำเร็จ', 'success')
          setSelectedSlotIds([])
          fetchSlots()
        }
      }
    )
  }

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    setCurrentUser(null)
    router.push('/login')
  }

  const filteredBookingSlots = slots.filter(
    s => s.floor_no === bookingFloor && s.zone_code === bookingZone
  )

  const filteredAdminSlots = slots.filter(
    s => s.floor_no === adminManageFloor && s.zone_code === adminManageZone
  )

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
        {/* ==================== TAB 1: เลือกช่องจอดรถ ==================== */}
        {activeTab === 'booking' && (
          <BookingSection
            slots={slots}
            rate={rate}
            uniqueFloors={uniqueFloors}
            bookingFloor={bookingFloor}
            setBookingFloor={setBookingFloor}
            bookingZone={bookingZone}
            setBookingZone={setBookingZone}
            bookingAvailableZones={bookingAvailableZones}
            filteredBookingSlots={filteredBookingSlots}
            selectedSlot={selectedSlot}
            setSelectedSlot={setSelectedSlot}
            onOpenBookingModal={() => setIsBookingModalOpen(true)}
          />
        )}

        {/* ==================== TAB 2: ตรวจสอบสถานะการจอง ==================== */}
        {activeTab === 'status' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs max-w-2xl mx-auto">
            <h2 className="text-base font-bold text-slate-800 mb-1">ตรวจสอบสถานะการจองที่จอดรถ</h2>
            <p className="text-xs text-slate-400 mb-4">กรอกป้ายทะเบียนรถเพื่อเรียกดูตั๋วการจองทั้งหมดของคุณ</p>

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

            {userTickets.length > 0 ? (
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-600 block">
                  พบรายการจองทั้งหมด {userTickets.length} รายการ:
                </span>
                
                {userTickets.map((ticket) => (
                  <div key={ticket.ticket_id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 block">ตั๋วเลขที่: {ticket.ticket_id}</span>
                        <h3 className="text-lg font-bold text-slate-800">{ticket.license_plate}</h3>
                      </div>
                      <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
                        ✓ จองสำเร็จ
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2 text-slate-700">
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-slate-400">ตำแหน่งช่องจอด:</span>
                        <span className="font-bold text-[#52B762]">
                          ชั้น {ticket.parking_slots?.floor_no || '-'} • โซน {ticket.parking_slots?.zone_code || '-'} (ช่อง {ticket.slot_id})
                        </span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-slate-400">เวลาเริ่มจอด:</span>
                        <span className="font-medium">{new Date(ticket.entry_time).toLocaleString('th-TH')}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-slate-400">เวลาสิ้นสุด:</span>
                        <span className="font-medium">{new Date(ticket.expected_exit).toLocaleString('th-TH')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ยอดชำระแล้ว:</span>
                        <span className="font-bold text-slate-900">{ticket.prepaid_amount} บาท</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400">
                กรอกป้ายทะเบียนด้านบนเพื่อเช็คสถานะการจอง
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 3: แผงควบคุม ADMIN ==================== */}
        {activeTab === 'admin' && currentUser?.role === 'ADMIN' && (
          <div className="space-y-6">
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
                <span className="text-xs text-slate-400">ไม่ว่าง / ไม่พร้อมใช้งาน</span>
                <p className="text-2xl font-bold text-rose-500">{slots.filter(s => s.status !== 'AVAILABLE').length}</p>
              </div>
            </div>

            {/* ตั้งค่าอัตราค่าบริการ */}
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

            {/* เพิ่มช่องจอดอัตโนมัติ */}
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

            {/* หน้ารายการช่องจอดทั้งหมด Admin */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">รายการช่องจอดทั้งหมด (Admin Slot Management)</h4>
                  <p className="text-xs text-slate-400">เลือกช่องจอดเพื่อเปลี่ยนสถานะ หรือลบออกพร้อมกันทีเดียวหลายช่องได้</p>
                </div>

                {/* แถบปุ่มจัดการพร้อมกันทีเดียว */}
                {selectedSlotIds.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-700 px-2">
                      เลือกอยู่ {selectedSlotIds.length} รายการ:
                    </span>
                    
                    <button
                      onClick={() => handleBulkUpdateStatus('AVAILABLE')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded-lg transition-all shadow-2xs flex items-center gap-1"
                    >
                      <i className="fa-solid fa-check"></i> ว่าง
                    </button>

                    <button
                      onClick={() => handleBulkUpdateStatus('OCCUPIED')}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold rounded-lg transition-all shadow-2xs flex items-center gap-1"
                    >
                      <i className="fa-solid fa-car"></i> ไม่ว่าง
                    </button>

                    <button
                      onClick={() => handleBulkUpdateStatus('UNAVAILABLE')}
                      className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-[11px] font-semibold rounded-lg transition-all shadow-2xs flex items-center gap-1"
                    >
                      <i className="fa-solid fa-ban"></i> ไม่พร้อมใช้งาน
                    </button>

                    <button
                      onClick={handleBulkDeleteSlots}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold rounded-lg transition-all shadow-2xs flex items-center gap-1"
                    >
                      <i className="fa-solid fa-trash-can"></i> ลบที่เลือก
                    </button>
                  </div>
                )}
              </div>

              {uniqueFloors.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">ยังไม่มีข้อมูลช่องจอดในระบบ</div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-700 block mb-2.5">
                      <i className="fa-solid fa-layer-group text-[#52B762] mr-1.5"></i> 1. เลือกชั้นที่ต้องการจัดการ:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {uniqueFloors.map(floor => (
                        <button
                          key={floor}
                          onClick={() => setAdminManageFloor(floor)}
                          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            adminManageFloor === floor
                              ? 'bg-[#52B762] text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          ชั้น {floor}
                        </button>
                      ))}
                    </div>
                  </div>

                  {adminAvailableZones.length > 0 && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-700 block mb-2.5">
                        <i className="fa-solid fa-grip text-[#52B762] mr-1.5"></i> 2. เลือกโซนในชั้น {adminManageFloor}:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {adminAvailableZones.map(zone => (
                          <button
                            key={zone}
                            onClick={() => setAdminManageZone(zone)}
                            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                              adminManageZone === zone
                                ? 'bg-slate-800 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            โซน {zone} (Zone {zone})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
                      <span className="text-xs font-bold text-slate-700">
                        3. รายการช่องจอดใน <span className="text-[#52B762]">ชั้น {adminManageFloor} • โซน {adminManageZone}</span> ({filteredAdminSlots.length} ช่อง)
                      </span>

                      {filteredAdminSlots.length > 0 && (
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100">
                          <input
                            type="checkbox"
                            checked={
                              filteredAdminSlots.length > 0 &&
                              filteredAdminSlots.every(s => selectedSlotIds.includes(s.slot_id))
                            }
                            onChange={(e) => handleSelectAllInCurrentZone(filteredAdminSlots, e.target.checked)}
                            className="rounded border-slate-300 text-[#52B762] focus:ring-[#52B762]"
                          />
                          เลือกโซน {adminManageZone} ทั้งหมด
                        </label>
                      )}
                    </div>

                    {filteredAdminSlots.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">ไม่พบช่องจอดในโซนนี้</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filteredAdminSlots.map(s => {
                          const isChecked = selectedSlotIds.includes(s.slot_id)
                          const statusBg = 
                            s.status === 'AVAILABLE' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
                            s.status === 'OCCUPIED' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                            'text-slate-500 bg-slate-100 border-slate-300'

                          const statusText = 
                            s.status === 'AVAILABLE' ? 'ว่าง' :
                            s.status === 'OCCUPIED' ? 'ไม่ว่าง' : 'ไม่พร้อมใช้งาน'

                          return (
                            <div
                              key={s.slot_id}
                              className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                                isChecked
                                  ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-200'
                                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
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
                                  <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-md inline-block mt-0.5 ${statusBg}`}>
                                    {statusText}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleToggleSlotStatus(s.slot_id, s.status)}
                                  title="กดเพื่อสลับสถานะ"
                                  className="px-2 py-1 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-lg text-[10px] font-medium text-slate-600"
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
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* MODAL ยืนยันการจอง */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-3xl p-6 shadow-xl transform transition-all duration-300 animate-[popIn_0.22s_ease-out]">
            <style jsx>{`
              @keyframes popIn {
                0% { opacity: 0; transform: scale(0.82); }
                100% { opacity: 1; transform: scale(1); }
              }
            `}</style>

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
                  src="/3Gdbm1.png" 
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

      {/* POP-UP MODAL แจ้งเตือน + Confirm พร้อม Animation */}
      <AlertModal
        alertModal={alertModal}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        onConfirm={confirmCallback}
      />
    </div>
  )
}
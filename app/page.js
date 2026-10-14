'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

// Import Components ที่แยกย่อยออกมา
import BookingSection from '../components/BookingSection'
import StatusSection from '../components/StatusSection'
import AdminSection from '../components/AdminSection'
import UserManagementSection from '../components/UserManagementSection'
import FinePaymentModal from '../components/FinePaymentModal'
import AlertModal from '../components/AlertModal'

export default function HomePage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [activeTab, setActiveTab] = useState('booking') // 'booking', 'status', 'admin', 'users'

  // Global Data States
  const [slots, setSlots] = useState([])
  const [rate, setRate] = useState({ rate_id: 1, first_hour_rate: 20, next_hour_rate: 20, fine_rate: 50 })
  const [selectedSlot, setSelectedSlot] = useState(null)

  // Custom Alert & Confirm Pop-up Modal State
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'success' })
  const [confirmCallback, setConfirmCallback] = useState(null)

  // Fine Payment Modal State
  const [fineModal, setFineModal] = useState({ isOpen: false, ticket: null, diffHours: 0, totalFine: 0 })

  // Admin Financial Reports State
  const [paymentsList, setPaymentsList] = useState([])
  const [finesList, setFinesList] = useState([])
  const [allTransactions, setAllTransactions] = useState([])

  // User Management State
  const [usersList, setUsersList] = useState([])
  const [editingUser, setEditingUser] = useState(null)
  const [editUsername, setEditUsername] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editRole, setEditRole] = useState('USER')

  // Booking Form State
  const [licensePlate, setLicensePlate] = useState('')
  const [phone, setPhone] = useState('')
  const [hoursToPark, setHoursToPark] = useState(1)
  const [calculatedPrice, setCalculatedPrice] = useState(0)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)

  // Ticket Status State
  const [searchPlate, setSearchPlate] = useState('')
  const [userTickets, setUserTickets] = useState([])

  // Admin Selectors & Inputs
  const [bookingFloor, setBookingFloor] = useState('')
  const [bookingZone, setBookingZone] = useState('')
  const [adminManageFloor, setAdminManageFloor] = useState('')
  const [adminManageZone, setAdminManageZone] = useState('')
  const [adminFloor, setAdminFloor] = useState('1')
  const [adminZone, setAdminZone] = useState('A')
  const [bulkCount, setBulkCount] = useState(10)
  const [inputFirstRate, setInputFirstRate] = useState(20)
  const [inputNextRate, setInputNextRate] = useState(20)
  const [inputFineRate, setInputFineRate] = useState(50)
  const [isUpdatingRate, setIsUpdatingRate] = useState(false)
  const [selectedSlotIds, setSelectedSlotIds] = useState([])

  const showAlert = (message, title = 'ดำเนินการสำเร็จ', type = 'success') => {
    setAlertModal({ isOpen: true, title, message, type })
  }

  const showConfirm = (message, title = 'ยืนยันการทำรายการ', onConfirmAction) => {
    setAlertModal({ isOpen: true, title, message, type: 'confirm' })
    setConfirmCallback(() => onConfirmAction)
  }

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser')
    if (userStr) {
      const u = JSON.parse(userStr)

      // ตรวจสอบว่าเวลาปัจจุบันเกิน 20 ชั่วโมงที่กำหนดไว้หรือยัง
      if (u.expiresAt && Date.now() > u.expiresAt) {
        localStorage.removeItem('currentUser')
        setCurrentUser(null)
        showAlert('เซสชันหมดอายุ (เกิน 20 ชั่วโมง) กรุณาเข้าสู่ระบบใหม่', 'แจ้งเตือน', 'error')
        router.push('/login')
        return
      }

      setCurrentUser(u)
      if (u.phone) setPhone(u.phone)
    }
    fetchSlots()
    fetchPricingRate()
  }, [])

  useEffect(() => {
    if (activeTab === 'status' && currentUser) fetchUserTickets()
    if (activeTab === 'admin' && currentUser?.role === 'ADMIN') fetchAdminFinancials()
    if (activeTab === 'users' && currentUser?.role === 'ADMIN') fetchUsers()
  }, [activeTab, currentUser])

  const uniqueFloors = Array.from(new Set(slots.map(s => s.floor_no))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const bookingAvailableZones = Array.from(new Set(slots.filter(s => s.floor_no === bookingFloor).map(s => s.zone_code))).sort()
  const adminAvailableZones = Array.from(new Set(slots.filter(s => s.floor_no === adminManageFloor).map(s => s.zone_code))).sort()

  useEffect(() => {
    if (uniqueFloors.length > 0) {
      if (!bookingFloor || !uniqueFloors.includes(bookingFloor)) setBookingFloor(uniqueFloors[0])
      if (!adminManageFloor || !uniqueFloors.includes(adminManageFloor)) setAdminManageFloor(uniqueFloors[0])
    }
  }, [uniqueFloors])

  useEffect(() => {
    if (bookingAvailableZones.length > 0) {
      if (!bookingZone || !bookingAvailableZones.includes(bookingZone)) setBookingZone(bookingAvailableZones[0])
    } else setBookingZone('')
  }, [bookingFloor, bookingAvailableZones])

  useEffect(() => {
    if (adminAvailableZones.length > 0) {
      if (!adminManageZone || !adminAvailableZones.includes(adminManageZone)) setAdminManageZone(adminAvailableZones[0])
    } else setAdminManageZone('')
  }, [adminManageFloor, adminAvailableZones])

  useEffect(() => {
    if (hoursToPark <= 1) setCalculatedPrice(Number(rate.first_hour_rate || 20))
    else setCalculatedPrice(Number(rate.first_hour_rate || 20) + ((hoursToPark - 1) * Number(rate.next_hour_rate || 20)))
  }, [hoursToPark, rate])

  const fetchSlots = async () => {
    const { data } = await supabase.from('parking_slots').select('*')
    if (data) setSlots(data.sort((a, b) => a.slot_id.localeCompare(b.slot_id, undefined, { numeric: true, sensitivity: 'base' })))
  }

  const fetchPricingRate = async () => {
    const { data } = await supabase.from('pricing_rates').select('*').limit(1).maybeSingle()
    if (data) {
      setRate(data)
      setInputFirstRate(data.first_hour_rate ?? 20)
      setInputNextRate(data.next_hour_rate ?? 20)
      setInputFineRate(data.fine_rate ?? 50)
    }
  }

  const fetchUserTickets = async (plateQuery = '') => {
    if (!currentUser) return setUserTickets([])
    let q = supabase.from('parking_transactions').select('*, parking_slots(*)').eq('user_id', currentUser.user_id).order('entry_time', { ascending: false })
    if (plateQuery.trim()) q = q.ilike('license_plate', `%${plateQuery.trim().toUpperCase()}%`)
    const { data } = await q
    setUserTickets(data || [])
  }

  const fetchAdminFinancials = async () => {
    const { data: payData } = await supabase.from('payments').select('*').order('paid_at', { ascending: false })
    const { data: fineData } = await supabase.from('fines').select('*').order('reported_at', { ascending: false })
    const { data: txData } = await supabase.from('parking_transactions').select('ticket_id, license_plate, slot_id, user_id, prepaid_amount, entry_time')

    const txMap = {}
    if (txData) txData.forEach(tx => { txMap[tx.ticket_id] = tx })
    setAllTransactions(txData || [])
    setFinesList(fineData || [])

    if (payData && payData.length > 0) {
      setPaymentsList(payData.map(p => ({ ...p, parking_transactions: txMap[p.ticket_id] || null })))
    } else {
      const txPayments = (txData || []).map(tx => ({ payment_id: `pay-tx-${tx.ticket_id}`, ticket_id: tx.ticket_id, amount: tx.prepaid_amount, payment_method: 'QR_PROMPTPAY', paid_at: tx.entry_time, parking_transactions: tx }))
      const finePayments = (fineData || []).map(f => ({ payment_id: `pay-fine-${f.fine_id}`, ticket_id: f.ticket_id, amount: f.fine_amount, payment_method: 'QR_PROMPTPAY (ค่าปรับ)', paid_at: f.reported_at, parking_transactions: txMap[f.ticket_id] || null }))
      setPaymentsList([...txPayments, ...finePayments].sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at)))
    }
  }

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*').order('user_id', { ascending: true })
    setUsersList(data || [])
  }

  const handleOpenEditUser = (user) => {
    setEditingUser(user)
    setEditUsername(user.username || '')
    setEditPassword(user.password || '')
    setEditPhone(user.phone || '')
    setEditRole(user.role || 'USER')
  }

  const handleSaveUser = async (e) => {
    e.preventDefault()
    if (!editingUser) return
    const payload = { username: editUsername.trim(), phone: editPhone.trim(), role: editRole }
    if (editPassword.trim()) payload.password = editPassword.trim()

    const { error } = await supabase.from('users').update(payload).eq('user_id', editingUser.user_id)
    if (error) showAlert('เกิดข้อผิดพลาด: ' + error.message, 'เกิดข้อผิดพลาด', 'error')
    else {
      showAlert(`อัปเดตข้อมูลผู้ใช้งาน ${editUsername} เรียบร้อยแล้ว!`, 'บันทึกสำเร็จ', 'success')
      if (currentUser?.user_id === editingUser.user_id) {
        const updated = { ...currentUser, ...payload }
        setCurrentUser(updated)
        localStorage.setItem('currentUser', JSON.stringify(updated))
      }
      setEditingUser(null)
      fetchUsers()
    }
  }

  const handleDeleteUser = (user) => {
    if (user.user_id === currentUser?.user_id) return showAlert('คุณไม่สามารถลบบัญชีตัวเองที่กำลังใช้งานอยู่ได้', 'แจ้งเตือน', 'error')
    showConfirm(`คุณต้องการลบผู้ใช้งาน "${user.username}" (ID: ${user.user_id}) ใช่หรือไม่?`, 'ยืนยันการลบผู้ใช้งาน', async () => {
      await supabase.from('users').delete().eq('user_id', user.user_id)
      showAlert(`ลบผู้ใช้งาน ${user.username} ออกจากระบบเรียบร้อยแล้ว`, 'ลบสำเร็จ', 'success')
      fetchUsers()
    })
  }

  const handleUpdatePricing = async (e) => {
    e.preventDefault()
    setIsUpdatingRate(true)
    await supabase.from('pricing_rates').update({ first_hour_rate: Number(inputFirstRate), next_hour_rate: Number(inputNextRate), fine_rate: Number(inputFineRate) }).eq('rate_id', rate.rate_id || 1)
    showAlert('บันทึกอัตราค่าบริการและค่าปรับใหม่เรียบร้อยแล้ว!', 'บันทึกสำเร็จ', 'success')
    fetchPricingRate()
    setIsUpdatingRate(false)
  }

  const handleBookingConfirm = async () => {
    if (!currentUser) return (showAlert('กรุณาเข้าสู่ระบบก่อนทำการจอง', 'แจ้งเตือน', 'error'), router.push('/login'))
    if (!licensePlate || !phone || !selectedSlot) return

    const cleanPlate = licensePlate.trim().toUpperCase()
    const ticketId = `TK-${Date.now()}-${selectedSlot.slot_id}`
    const entryTime = new Date()
    const exitTime = new Date(entryTime.getTime() + hoursToPark * 60 * 60 * 1000)

    const { error: txError } = await supabase.from('parking_transactions').insert([{
      ticket_id: ticketId, user_id: currentUser.user_id, slot_id: selectedSlot.slot_id,
      rate_id: rate?.rate_id || 1, license_plate: cleanPlate, entry_time: entryTime.toISOString(),
      expected_exit: exitTime.toISOString(), prepaid_amount: calculatedPrice, grand_total: calculatedPrice
    }])

    if (txError) return showAlert('เกิดข้อผิดพลาดในการบันทึกการจอง: ' + txError.message, 'เกิดข้อผิดพลาด', 'error')

    await supabase.from('payments').insert([{ ticket_id: ticketId, amount: calculatedPrice, payment_method: 'QR_PROMPTPAY', paid_at: entryTime.toISOString() }])
    await supabase.from('parking_slots').update({ status: 'OCCUPIED' }).eq('slot_id', selectedSlot.slot_id)

    showAlert('ชำระเงินและยืนยันการจองสำเร็จ!', 'จองสำเร็จ', 'success')
    setIsBookingModalOpen(false)
    fetchSlots()
    setActiveTab('status')
    fetchUserTickets(cleanPlate)
    setSelectedSlot(null)
    setLicensePlate('')
  }

  const handleCheckOutSlot = (ticket) => {
    const now = new Date()
    const exitStr = ticket.expected_exit.endsWith('Z') ? ticket.expected_exit : ticket.expected_exit + 'Z'
    const expectedExit = new Date(exitStr)

    if (now > expectedExit) {
      const diffMs = now.getTime() - expectedExit.getTime()
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
      const totalFine = diffHours * (rate?.fine_rate || 50)
      setFineModal({ isOpen: true, ticket, diffHours, totalFine })
    } else {
      showConfirm(`คุณต้องการนำรถออกจากช่อง ${ticket.slot_id} และคืนช่องจอดใช่หรือไม่?`, 'ยืนยันการคืนช่องจอด', async () => {
        await processCheckOut(ticket, 0)
      })
    }
  }

  const processCheckOut = async (ticket, totalFine = 0) => {
    const now = new Date()
    if (totalFine > 0) {
      await supabase.from('fines').insert([{ ticket_id: ticket.ticket_id, fine_type_id: 1, reported_by_user: currentUser?.user_id || ticket.user_id, fine_amount: totalFine, reported_at: now.toISOString() }])
      await supabase.from('payments').insert([{ ticket_id: ticket.ticket_id, amount: totalFine, payment_method: 'QR_PROMPTPAY', paid_at: now.toISOString() }])
    }

    await supabase.from('parking_transactions').update({ actual_exit: now.toISOString() }).eq('ticket_id', ticket.ticket_id)
    await supabase.from('parking_slots').update({ status: 'AVAILABLE' }).eq('slot_id', ticket.slot_id)

    showAlert(totalFine > 0 ? `ชำระค่าปรับ ${totalFine} บาท และคืนช่องจอด ${ticket.slot_id} เรียบร้อยแล้ว!` : `นำรถออกจากช่อง ${ticket.slot_id} และคืนช่องจอดเรียบร้อยแล้ว!`, 'คืนช่องจอดสำเร็จ', 'success')
    setFineModal({ isOpen: false, ticket: null, diffHours: 0, totalFine: 0 })
    fetchSlots()
    fetchUserTickets(searchPlate)
  }

  const handleBulkCreateSlots = async () => {
    if (!adminFloor || !adminZone || !bulkCount || bulkCount <= 0) return showAlert('กรุณากรอกข้อมูล ชั้น โซน และจำนวนช่องจอดให้ครบถ้วน', 'ข้อมูลไม่ครบถ้วน', 'error')
    const newSlots = []
    const floor = adminFloor.trim()
    const prefix = adminZone.trim().toUpperCase()

    for (let i = 1; i <= parseInt(bulkCount); i++) {
      newSlots.push({ slot_id: `${floor}${prefix}${i}`, floor_no: floor, zone_code: prefix, status: 'AVAILABLE' })
    }

    await supabase.from('parking_slots').upsert(newSlots, { onConflict: 'slot_id', ignoreDuplicates: true })
    showAlert(`ประมวลผลช่องจอด ${floor}${prefix}1 ถึง ${floor}${prefix}${bulkCount} เรียบร้อยแล้ว!`, 'สร้างช่องจอดสำเร็จ', 'success')
    fetchSlots()
    setAdminManageFloor(floor)
    setAdminManageZone(prefix)
  }

  const handleDeleteSlot = (slotId) => {
    showConfirm(`คุณต้องการลบช่องจอด ${slotId} ออกจากระบบใช่หรือไม่?`, 'ยืนยันการลบช่องจอด', async () => {
      await supabase.from('parking_slots').delete().eq('slot_id', slotId)
      setSelectedSlotIds(prev => prev.filter(id => id !== slotId))
      showAlert(`ลบช่องจอด ${slotId} สำเร็จแล้ว`, 'ลบสำเร็จ', 'success')
      fetchSlots()
    })
  }

  const handleToggleSelectSlot = (slotId) => setSelectedSlotIds(prev => prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId])

  const handleSelectAllInCurrentZone = (currentZoneSlots, isChecked) => {
    const zoneSlotIds = currentZoneSlots.map(s => s.slot_id)
    setSelectedSlotIds(prev => isChecked ? Array.from(new Set([...prev, ...zoneSlotIds])) : prev.filter(id => !zoneSlotIds.includes(id)))
  }

  const handleBulkUpdateStatus = (newStatus) => {
    if (selectedSlotIds.length === 0) return
    const statusLabel = newStatus === 'AVAILABLE' ? 'ว่าง' : newStatus === 'OCCUPIED' ? 'ไม่ว่าง' : 'ไม่พร้อมใช้งาน'
    showConfirm(`คุณต้องการเปลี่ยนสถานะช่องจอดที่เลือกจำนวน ${selectedSlotIds.length} รายการ เป็น "${statusLabel}" ใช่หรือไม่?`, 'ยืนยันการเปลี่ยนสถานะ', async () => {
      await supabase.from('parking_slots').update({ status: newStatus }).in('slot_id', selectedSlotIds)
      showAlert(`เปลี่ยนสถานะช่องจอด ${selectedSlotIds.length} รายการเป็น "${statusLabel}" สำเร็จ!`, 'เปลี่ยนสถานะสำเร็จ', 'success')
      setSelectedSlotIds([])
      fetchSlots()
    })
  }

  const handleBulkDeleteSlots = () => {
    if (selectedSlotIds.length === 0) return
    showConfirm(`ยืนยันการลบช่องจอดที่เลือกจำนวน ${selectedSlotIds.length} รายการใช่หรือไม่?`, 'ยืนยันการลบช่องจอดหลายรายการ', async () => {
      await supabase.from('parking_slots').delete().in('slot_id', selectedSlotIds)
      showAlert(`ลบช่องจอดสำเร็จแล้ว ${selectedSlotIds.length} รายการ!`, 'ลบสำเร็จ', 'success')
      setSelectedSlotIds([])
      fetchSlots()
    })
  }

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    setCurrentUser(null)
    router.push('/login')
  }

  const filteredBookingSlots = slots.filter(s => s.floor_no === bookingFloor && s.zone_code === bookingZone)
  const filteredAdminSlots = slots.filter(s => s.floor_no === adminManageFloor && s.zone_code === adminManageZone)
  const totalParkingRevenue = allTransactions.reduce((acc, t) => acc + (Number(t.prepaid_amount) || 0), 0)
  const totalFines = finesList.reduce((acc, f) => acc + (Number(f.fine_amount) || 0), 0)

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
          className={`flex-1 py-3 text-xs font-semibold rounded-xl border transition-all ${activeTab === 'booking' ? 'bg-[#52B762] text-white border-[#52B762] shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
        >
          <i className="fa-solid fa-car mr-2"></i> เลือกช่องจอดรถ (Real-time)
        </button>
        <button
          onClick={() => setActiveTab('status')}
          className={`flex-1 py-3 text-xs font-semibold rounded-xl border transition-all ${activeTab === 'status' ? 'bg-[#52B762] text-white border-[#52B762] shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
        >
          <i className="fa-solid fa-clock mr-2"></i> ตรวจสอบสถานะการจอง
        </button>
        {currentUser?.role === 'ADMIN' && (
          <>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 py-3 text-xs font-semibold rounded-xl border transition-all ${activeTab === 'admin' ? 'bg-slate-800 text-white border-slate-800 shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
            >
              <i className="fa-solid fa-sliders mr-2"></i> แผงควบคุม Admin
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-3 text-xs font-semibold rounded-xl border transition-all ${activeTab === 'users' ? 'bg-indigo-700 text-white border-indigo-700 shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
            >
              <i className="fa-solid fa-users-gear mr-2"></i> จัดการผู้ใช้งาน
            </button>
          </>
        )}
      </div>

      {/* MAIN BODY CONTENT COMPONENT RENDERER */}
      <main className="w-full max-w-6xl">
        {/* TAB 1: เลือกช่องจอดรถ */}
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

        {/* TAB 2: ตรวจสอบสถานะการจอง */}
        {activeTab === 'status' && (
          <StatusSection
            currentUser={currentUser}
            userTickets={userTickets}
            searchPlate={searchPlate}
            setSearchPlate={setSearchPlate}
            fetchUserTickets={fetchUserTickets}
            handleCheckOutSlot={handleCheckOutSlot}
          />
        )}

        {/* TAB 3: แผงควบคุม ADMIN */}
        {activeTab === 'admin' && currentUser?.role === 'ADMIN' && (
          <AdminSection
            slots={slots}
            totalRevenue={totalParkingRevenue + totalFines}
            totalParkingRevenue={totalParkingRevenue}
            totalFines={totalFines}
            inputFirstRate={inputFirstRate}
            setInputFirstRate={setInputFirstRate}
            inputNextRate={inputNextRate}
            setInputNextRate={setInputNextRate}
            inputFineRate={inputFineRate}
            setInputFineRate={setInputFineRate}
            handleUpdatePricing={handleUpdatePricing}
            isUpdatingRate={isUpdatingRate}
            adminFloor={adminFloor}
            setAdminFloor={setAdminFloor}
            adminZone={adminZone}
            setAdminZone={setAdminZone}
            bulkCount={bulkCount}
            setBulkCount={setBulkCount}
            handleBulkCreateSlots={handleBulkCreateSlots}
            uniqueFloors={uniqueFloors}
            adminManageFloor={adminManageFloor}
            setAdminManageFloor={setAdminManageFloor}
            adminAvailableZones={adminAvailableZones}
            adminManageZone={adminManageZone}
            setAdminManageZone={setAdminManageZone}
            filteredAdminSlots={filteredAdminSlots}
            selectedSlotIds={selectedSlotIds}
            handleSelectAllInCurrentZone={handleSelectAllInCurrentZone}
            handleToggleSelectSlot={handleToggleSelectSlot}
            handleDeleteSlot={handleDeleteSlot}
            handleBulkUpdateStatus={handleBulkUpdateStatus}
            handleBulkDeleteSlots={handleBulkDeleteSlots}
            paymentsList={paymentsList}
          />
        )}

        {/* TAB 4: จัดการผู้ใช้งาน (ADMIN ONLY) */}
        {activeTab === 'users' && currentUser?.role === 'ADMIN' && (
          <UserManagementSection
            usersList={usersList}
            currentUser={currentUser}
            fetchUsers={fetchUsers}
            handleOpenEditUser={handleOpenEditUser}
            handleDeleteUser={handleDeleteUser}
            editingUser={editingUser}
            setEditingUser={setEditingUser}
            editUsername={editUsername}
            setEditUsername={setEditUsername}
            editPassword={editPassword}
            setEditPassword={setEditPassword}
            editPhone={editPhone}
            setEditPhone={setEditPhone}
            editRole={editRole}
            setEditRole={setEditRole}
            handleSaveUser={handleSaveUser}
          />
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

      {/* FINE PAYMENT MODAL */}
      <FinePaymentModal
        fineModal={fineModal}
        setFineModal={setFineModal}
        processCheckOut={processCheckOut}
      />

      {/* POP-UP CONFIRM/ALERT MODAL */}
      <AlertModal
        alertModal={alertModal}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        onConfirm={confirmCallback}
      />
    </div>
  )
}
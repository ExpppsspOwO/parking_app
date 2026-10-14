'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import BookingSection from '../components/BookingSection'
import AlertModal from '../components/AlertModal'

export default function HomePage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [activeTab, setActiveTab] = useState('booking') // 'booking', 'status', 'admin', 'users'

  // Data States
  const [slots, setSlots] = useState([])
  const [rate, setRate] = useState({ rate_id: 1, first_hour_rate: 20, next_hour_rate: 20, fine_rate: 50 })
  const [selectedSlot, setSelectedSlot] = useState(null)

  // Custom Alert & Confirm Pop-up Modal State
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  })
  const [confirmCallback, setConfirmCallback] = useState(null)

  // Fine Payment Modal State
  const [fineModal, setFineModal] = useState({
    isOpen: false,
    ticket: null,
    diffHours: 0,
    totalFine: 0
  })

  // Admin Financial Reports State
  const [paymentsList, setPaymentsList] = useState([])
  const [finesList, setFinesList] = useState([])

  // User Management State
  const [usersList, setUsersList] = useState([])
  const [editingUser, setEditingUser] = useState(null)
  const [editUsername, setEditUsername] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editRole, setEditRole] = useState('USER')

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

  useEffect(() => {
    if (activeTab === 'status' && currentUser) {
      fetchUserTickets()
    }
    if (activeTab === 'admin' && currentUser?.role === 'ADMIN') {
      fetchAdminFinancials()
    }
    if (activeTab === 'users' && currentUser?.role === 'ADMIN') {
      fetchUsers()
    }
  }, [activeTab, currentUser])

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
    const { data } = await supabase.from('pricing_rates').select('*').limit(1).maybeSingle()
    if (data) {
      setRate(data)
      setInputFirstRate(data.first_hour_rate ?? 20)
      setInputNextRate(data.next_hour_rate ?? 20)
      setInputFineRate(data.fine_rate ?? 50)
    }
  }

  const fetchUserTickets = async (plateQuery = '') => {
    if (!currentUser) {
      setUserTickets([])
      return
    }

    let dbQuery = supabase
      .from('parking_transactions')
      .select('*, parking_slots(*)')
      .eq('user_id', currentUser.user_id)
      .order('entry_time', { ascending: false })

    if (plateQuery.trim()) {
      dbQuery = dbQuery.ilike('license_plate', `%${plateQuery.trim().toUpperCase()}%`)
    }

    const { data, error } = await dbQuery

    if (error) {
      console.error('Error fetching user tickets:', error)
      setUserTickets([])
    } else {
      setUserTickets(data || [])
    }
  }

  // 📊 ดึงข้อมูลรายงานการเงินสำหรับ Admin (แก้ปัญหา Join ติด Error)
  const fetchAdminFinancials = async () => {
    const { data: payData } = await supabase
      .from('payments')
      .select('*')
      .order('paid_at', { ascending: false })

    const { data: fineData } = await supabase
      .from('fines')
      .select('*')
      .order('reported_at', { ascending: false })

    const { data: txData } = await supabase
      .from('parking_transactions')
      .select('ticket_id, license_plate, slot_id, user_id')

    const txMap = {}
    if (txData) {
      txData.forEach(tx => {
        txMap[tx.ticket_id] = tx
      })
    }

    const mappedPayments = (payData || []).map(p => ({
      ...p,
      parking_transactions: txMap[p.ticket_id] || null
    }))

    const mappedFines = (fineData || []).map(f => ({
      ...f,
      parking_transactions: txMap[f.ticket_id] || null
    }))

    setPaymentsList(mappedPayments)
    setFinesList(mappedFines)
  }

  // 👥 ดึงรายชื่อผู้ใช้งานทั้งหมด
  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('user_id', { ascending: true })

    if (error) {
      console.error('Error fetching users:', error)
    } else {
      setUsersList(data || [])
    }
  }

  // เปิด Modal แก้ไขผู้ใช้งาน
  const handleOpenEditUser = (user) => {
    setEditingUser(user)
    setEditUsername(user.username || '')
    setEditPassword(user.password || '')
    setEditPhone(user.phone || '')
    setEditRole(user.role || 'USER')
  }

  // บันทึกการแก้ไขผู้ใช้งาน
  const handleSaveUser = async (e) => {
    e.preventDefault()
    if (!editingUser) return

    const payload = {
      username: editUsername.trim(),
      phone: editPhone.trim(),
      role: editRole
    }

    if (editPassword.trim()) {
      payload.password = editPassword.trim()
    }

    const { error } = await supabase
      .from('users')
      .update(payload)
      .eq('user_id', editingUser.user_id)

    if (error) {
      showAlert('เกิดข้อผิดพลาดในการอัปเดตผู้ใช้: ' + error.message, 'เกิดข้อผิดพลาด', 'error')
    } else {
      showAlert(`อัปเดตข้อมูลผู้ใช้งาน ${editUsername} เรียบร้อยแล้ว!`, 'บันทึกสำเร็จ', 'success')
      
      // ถ้าแก้ไขบัญชีตัวเองที่กำลังล็อกอินอยู่ ให้ปรับปรุง localStorage
      if (currentUser?.user_id === editingUser.user_id) {
        const updatedUser = { ...currentUser, ...payload }
        setCurrentUser(updatedUser)
        localStorage.setItem('currentUser', JSON.stringify(updatedUser))
      }

      setEditingUser(null)
      fetchUsers()
    }
  }

  // ลบผู้ใช้งานออกจากระบบ
  const handleDeleteUser = (user) => {
    if (user.user_id === currentUser?.user_id) {
      showAlert('คุณไม่สามารถลบบัญชีตัวเองที่กำลังใช้งานอยู่ได้', 'แจ้งเตือน', 'error')
      return
    }

    showConfirm(
      `คุณต้องการลบผู้ใช้งาน "${user.username}" (ID: ${user.user_id}) ใช่หรือไม่?`,
      'ยืนยันการลบผู้ใช้งาน',
      async () => {
        const { error } = await supabase.from('users').delete().eq('user_id', user.user_id)
        if (error) {
          showAlert('เกิดข้อผิดพลาดในการลบผู้ใช้: ' + error.message, 'เกิดข้อผิดพลาด', 'error')
        } else {
          showAlert(`ลบผู้ใช้งาน ${user.username} ออกจากระบบเรียบร้อยแล้ว`, 'ลบสำเร็จ', 'success')
          fetchUsers()
        }
      }
    )
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

  const handleBookingConfirm = async () => {
    if (!currentUser) {
      showAlert('กรุณาเข้าสู่ระบบก่อนทำการจอง', 'แจ้งเตือน', 'error')
      router.push('/login')
      return
    }
    if (!licensePlate || !phone || !selectedSlot) return

    const cleanPlate = licensePlate.trim().toUpperCase()
    const activeRateId = rate?.rate_id || 1
    const ticketId = `TK-${Date.now()}-${selectedSlot.slot_id}`
    const entryTime = new Date()
    const exitTime = new Date(entryTime.getTime() + hoursToPark * 60 * 60 * 1000)

    const { error: txError } = await supabase.from('parking_transactions').insert([{
      ticket_id: ticketId,
      user_id: currentUser.user_id,
      slot_id: selectedSlot.slot_id,
      rate_id: activeRateId,
      license_plate: cleanPlate,
      entry_time: entryTime.toISOString(),
      expected_exit: exitTime.toISOString(),
      prepaid_amount: calculatedPrice,
      grand_total: calculatedPrice
    }])

    if (txError) {
      showAlert('เกิดข้อผิดพลาดในการบันทึกการจอง: ' + txError.message, 'เกิดข้อผิดพลาด', 'error')
      return
    }

    await supabase.from('payments').insert([{
      ticket_id: ticketId,
      amount: calculatedPrice,
      payment_method: 'QR_PROMPTPAY',
      paid_at: new Date().toISOString(),
      status: 'COMPLETED'
    }])

    await supabase.from('parking_slots')
      .update({ status: 'OCCUPIED' })
      .eq('slot_id', selectedSlot.slot_id)

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
      const fineRate = rate?.fine_rate || 50
      const totalFine = diffHours * fineRate

      setFineModal({
        isOpen: true,
        ticket,
        diffHours,
        totalFine
      })
    } else {
      showConfirm(
        `คุณต้องการนำรถออกจากช่อง ${ticket.slot_id} และคืนช่องจอดใช่หรือไม่?`,
        'ยืนยันการคืนช่องจอด',
        async () => {
          await processCheckOut(ticket, 0)
        }
      )
    }
  }

  const processCheckOut = async (ticket, totalFine = 0) => {
    const now = new Date()

    if (totalFine > 0) {
      await supabase.from('fines').insert([{
        ticket_id: ticket.ticket_id,
        fine_type_id: 1,
        reported_by_user: currentUser?.user_id || ticket.user_id,
        fine_amount: totalFine,
        reported_at: now.toISOString()
      }])

      await supabase.from('payments').insert([{
        ticket_id: ticket.ticket_id,
        amount: totalFine,
        payment_method: 'QR_PROMPTPAY',
        paid_at: now.toISOString(),
        status: 'COMPLETED'
      }])
    }

    await supabase
      .from('parking_transactions')
      .update({ actual_exit: now.toISOString() })
      .eq('ticket_id', ticket.ticket_id)

    await supabase
      .from('parking_slots')
      .update({ status: 'AVAILABLE' })
      .eq('slot_id', ticket.slot_id)

    showAlert(
      totalFine > 0 
        ? `ชำระค่าปรับ ${totalFine} บาท และคืนช่องจอด ${ticket.slot_id} เรียบร้อยแล้ว!` 
        : `นำรถออกจากช่อง ${ticket.slot_id} และคืนช่องจอดเรียบร้อยแล้ว!`,
      'คืนช่องจอดสำเร็จ',
      'success'
    )

    setFineModal({ isOpen: false, ticket: null, diffHours: 0, totalFine: 0 })
    fetchSlots()
    fetchUserTickets(searchPlate)
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
      .upsert(newSlots, { onConflict: 'slot_id', ignoreDuplicates: true })

    if (error) {
      showAlert('เกิดข้อผิดพลาด: ' + error.message, 'เกิดข้อผิดพลาด', 'error')
    } else {
      showAlert(`ประมวลผลช่องจอด ${floor}${prefix}1 ถึง ${floor}${prefix}${bulkCount} เรียบร้อยแล้ว!`, 'สร้างช่องจอดสำเร็จ', 'success')
      fetchSlots()
      setAdminManageFloor(floor)
      setAdminManageZone(prefix)
    }
  }

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

  const totalRevenue = paymentsList.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
  const totalFines = finesList.reduce((acc, f) => acc + (Number(f.fine_amount) || 0), 0)
  const totalParkingRevenue = totalRevenue - totalFines

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
          <>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 py-3 text-xs font-semibold rounded-xl border transition-all ${
                activeTab === 'admin' ? 'bg-slate-800 text-white border-slate-800 shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <i className="fa-solid fa-sliders mr-2"></i> แผงควบคุม Admin
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-3 text-xs font-semibold rounded-xl border transition-all ${
                activeTab === 'users' ? 'bg-indigo-700 text-white border-indigo-700 shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <i className="fa-solid fa-users-gear mr-2"></i> จัดการผู้ใช้งาน
            </button>
          </>
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
            <p className="text-xs text-slate-400 mb-4">
              {currentUser ? `แสดงรายการจองทั้งหมดของคุณ (${currentUser.username})` : 'กรุณาเข้าสู่ระบบเพื่อดูตั๋วการจอง'}
            </p>

            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={searchPlate}
                onChange={(e) => setSearchPlate(e.target.value)}
                placeholder="ค้นหาเฉพาะป้ายทะเบียนของคุณ..."
                className="flex-1 bg-slate-50 border border-slate-200 h-11 rounded-xl px-4 text-xs font-medium uppercase focus:outline-none focus:border-[#52B762]"
              />
              <button 
                onClick={() => fetchUserTickets(searchPlate)} 
                className="px-6 bg-[#52B762] hover:bg-[#439E51] text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
              >
                ค้นหา
              </button>
            </div>

            {!currentUser ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400">
                กรุณาเข้าสู่ระบบก่อนเพื่อตรวจสอบตั๋วการจองของคุณ
              </div>
            ) : userTickets.length > 0 ? (
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-600 block">
                  พบรายการจองทั้งหมดของคุณ {userTickets.length} รายการ:
                </span>
                
                {userTickets.map((ticket) => {
                  const isCurrentlyParked = !ticket.actual_exit

                  return (
                    <div key={ticket.ticket_id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-mono">ตั๋วเลขที่: {ticket.ticket_id}</span>
                          <h3 className="text-lg font-bold text-slate-800">
                            {ticket.license_plate || 'ไม่ระบุป้ายทะเบียน'}
                          </h3>
                        </div>
                        
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                          isCurrentlyParked 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                            : 'bg-slate-200 text-slate-600 border-slate-300'
                        }`}>
                          {isCurrentlyParked ? '✓ กำลังจอดอยู่' : 'คืนช่องจอดแล้ว'}
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
                          <span className="text-slate-400">เวลาสิ้นสุด (คาดการณ์):</span>
                          <span className="font-medium">{new Date(ticket.expected_exit).toLocaleString('th-TH')}</span>
                        </div>
                        {ticket.actual_exit && (
                          <div className="flex justify-between border-b pb-2 text-slate-500">
                            <span className="text-slate-400">เวลาที่ออกจริง:</span>
                            <span className="font-medium">{new Date(ticket.actual_exit).toLocaleString('th-TH')}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-400">ยอดชำระแล้ว:</span>
                          <span className="font-bold text-slate-900">{ticket.prepaid_amount} บาท</span>
                        </div>
                      </div>

                      {isCurrentlyParked && (
                        <button
                          onClick={() => handleCheckOutSlot(ticket)}
                          className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 mt-2"
                        >
                          <i className="fa-solid fa-car"></i>
                          แจ้งนำรถออก / คืนช่องจอด ({ticket.slot_id})
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400">
                ไม่พบรายการตั๋วการจองของคุณในระบบ
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 3: แผงควบคุม ADMIN ==================== */}
        {activeTab === 'admin' && currentUser?.role === 'ADMIN' && (
          <div className="space-y-6">
            
            {/* สรุปภาพรวมช่องจอด และ ยอดเงินการเงิน */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 border border-slate-200 rounded-2xl text-center shadow-xs">
                <span className="text-xs text-slate-400 block mb-1">ช่องจอดทั้งหมด</span>
                <p className="text-2xl font-bold text-slate-800">{slots.length}</p>
                <span className="text-[10px] text-emerald-600 mt-1 block">ว่าง {slots.filter(s => s.status === 'AVAILABLE').length} ช่อง</span>
              </div>

              <div className="bg-white p-4 border border-slate-200 rounded-2xl text-center shadow-xs">
                <span className="text-xs text-slate-400 block mb-1">รายได้รวมทั้งหมด</span>
                <p className="text-2xl font-bold text-[#52B762]">{totalRevenue.toLocaleString()} ฿</p>
                <span className="text-[10px] text-slate-400 mt-1 block">จากตาราง payments</span>
              </div>

              <div className="bg-white p-4 border border-slate-200 rounded-2xl text-center shadow-xs">
                <span className="text-xs text-slate-400 block mb-1">รายได้ค่าบริการจอด</span>
                <p className="text-2xl font-bold text-sky-600">{totalParkingRevenue.toLocaleString()} ฿</p>
                <span className="text-[10px] text-slate-400 mt-1 block">ยอดชำระการจองปกติ</span>
              </div>

              <div className="bg-white p-4 border border-slate-200 rounded-2xl text-center shadow-xs">
                <span className="text-xs text-slate-400 block mb-1">รายได้ค่าปรับเกินเวลา</span>
                <p className="text-2xl font-bold text-rose-500">{totalFines.toLocaleString()} ฿</p>
                <span className="text-[10px] text-slate-400 mt-1 block">จากตาราง fines</span>
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
                  <p className="text-xs text-slate-400">ติ๊กเลือกช่องจอดเพื่อเปลี่ยนสถานะ หรือลบออกจากระบบพร้อมกัน</p>
                </div>

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
                                  onClick={() => handleDeleteSlot(s.slot_id)}
                                  className="px-2.5 py-1 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg text-[10px] font-medium transition-all"
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

            {/* รายงานประวัติการชำระเงินย้อนหลัง */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h4 className="text-sm font-bold text-slate-800 mb-1">รายงานประวัติการชำระเงินย้อนหลัง (Payment History)</h4>
              <p className="text-xs text-slate-400 mb-4">ข้อมูลธุรกรรมการชำระเงินจากตาราง payments</p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <th className="p-3">Ticket ID</th>
                      <th className="p-3">ทะเบียนรถ</th>
                      <th className="p-3">ช่องจอด</th>
                      <th className="p-3">ยอดชำระ</th>
                      <th className="p-3">วิธีชำระ</th>
                      <th className="p-3">วันที่ชำระเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentsList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-400">ยังไม่มีข้อมูลการชำระเงิน</td>
                      </tr>
                    ) : (
                      paymentsList.map(pay => (
                        <tr key={pay.payment_id || pay.paid_at} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-semibold text-slate-700">{pay.ticket_id}</td>
                          <td className="p-3 font-bold text-slate-800">{pay.parking_transactions?.license_plate || '-'}</td>
                          <td className="p-3 font-bold text-[#52B762]">{pay.parking_transactions?.slot_id || '-'}</td>
                          <td className="p-3 font-bold text-slate-900">{pay.amount} ฿</td>
                          <td className="p-3">
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-semibold">
                              {pay.payment_method}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">{new Date(pay.paid_at).toLocaleString('th-TH')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ==================== TAB 4: จัดการผู้ใช้งาน (ADMIN ONLY) ==================== */}
        {activeTab === 'users' && currentUser?.role === 'ADMIN' && (
          <div className="space-y-6">
            
            {/* สรุปจำนวนผู้ใช้งาน */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 border border-slate-200 rounded-2xl text-center shadow-xs">
                <span className="text-xs text-slate-400 block mb-1">ผู้ใช้งานทั้งหมด</span>
                <p className="text-2xl font-bold text-slate-800">{usersList.length}</p>
                <span className="text-[10px] text-indigo-600 mt-1 block">บัญชีในระบบ</span>
              </div>

              <div className="bg-white p-4 border border-slate-200 rounded-2xl text-center shadow-xs">
                <span className="text-xs text-slate-400 block mb-1">ผู้ดูแลระบบ (ADMIN)</span>
                <p className="text-2xl font-bold text-indigo-700">{usersList.filter(u => u.role === 'ADMIN').length}</p>
                <span className="text-[10px] text-slate-400 mt-1 block">สิทธิ์แอดมิน</span>
              </div>

              <div className="bg-white p-4 border border-slate-200 rounded-2xl text-center shadow-xs">
                <span className="text-xs text-slate-400 block mb-1">ผู้ใช้ทั่วไป (USER)</span>
                <p className="text-2xl font-bold text-emerald-600">{usersList.filter(u => u.role !== 'ADMIN').length}</p>
                <span className="text-[10px] text-slate-400 mt-1 block">สิทธิ์ผู้ใช้งานทั่วไป</span>
              </div>
            </div>

            {/* ตารางจัดการผู้ใช้งาน */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">รายชื่อผู้ใช้งานทั้งหมด (User Management)</h3>
                  <p className="text-xs text-slate-400">แก้ไขข้อมูลผู้ใช้ สลับสิทธิ์ ADMIN/USER หรือลบบัญชีออกจากระบบ</p>
                </div>
                <button
                  onClick={fetchUsers}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-all"
                >
                  <i className="fa-solid fa-rotate-right mr-1"></i> รีเฟรชข้อมูล
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <th className="p-3">User ID</th>
                      <th className="p-3">ชื่อผู้ใช้ (Username)</th>
                      <th className="p-3">เบอร์โทรศัพท์</th>
                      <th className="p-3">สิทธิ์ใช้งาน (Role)</th>
                      <th className="p-3 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">ยังไม่มีข้อมูลผู้ใช้งานในระบบ</td>
                      </tr>
                    ) : (
                      usersList.map(user => {
                        const isAdmin = user.role === 'ADMIN'
                        return (
                          <tr key={user.user_id} className="hover:bg-slate-50 transition-all">
                            <td className="p-3 font-mono font-bold text-slate-600">{user.user_id}</td>
                            <td className="p-3 font-bold text-slate-800">
                              {user.username}
                              {user.user_id === currentUser?.user_id && (
                                <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                                  คุณ
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-slate-600">{user.phone || '-'}</td>
                            <td className="p-3">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                isAdmin 
                                  ? 'bg-indigo-100 text-indigo-800 border-indigo-200' 
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                {isAdmin ? '🛡️ ADMIN' : '👤 USER'}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-2">
                              <button
                                onClick={() => handleOpenEditUser(user)}
                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-semibold transition-all"
                              >
                                <i className="fa-solid fa-pen-to-square mr-1"></i> แก้ไข
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold transition-all"
                              >
                                <i className="fa-solid fa-trash-can mr-1"></i> ลบ
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* MODAL แก้ไขข้อมูลผู้ใช้งาน (EDIT USER MODAL) */}
      {editingUser && (
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
                แก้ไขข้อมูลผู้ใช้งาน (ID: {editingUser.user_id})
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">ชื่อผู้ใช้งาน (Username) *</label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 h-10 rounded-xl px-3 text-xs font-medium focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">รหัสผ่านใหม่ (Password)</label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="กรอกหากต้องการเปลี่ยนรหัสผ่าน"
                  className="w-full bg-slate-50 border border-slate-200 h-10 rounded-xl px-3 text-xs font-medium focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">เบอร์โทรศัพท์</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 h-10 rounded-xl px-3 text-xs font-medium focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">สิทธิ์การใช้งาน (Role) *</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 h-10 rounded-xl px-3 text-xs font-medium focus:outline-none focus:border-indigo-600"
                >
                  <option value="USER">👤 USER (ผู้ใช้ทั่วไป)</option>
                  <option value="ADMIN">🛡️ ADMIN (ผู้ดูแลระบบ)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* MODAL ชำระค่าปรับกรณีจอดเกินเวลา */}
      {fineModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-3xl p-6 shadow-xl transform transition-all duration-300 animate-[popIn_0.22s_ease-out]">
            <style jsx>{`
              @keyframes popIn {
                0% { opacity: 0; transform: scale(0.82); }
                100% { opacity: 1; transform: scale(1); }
              }
            `}</style>

            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-rose-600 flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation"></i> จอดเกินเวลาที่กำหนด
              </h3>
              <button onClick={() => setFineModal({ isOpen: false, ticket: null, diffHours: 0, totalFine: 0 })} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              ตั๋วหมายเลข <span className="font-mono font-bold">{fineModal.ticket?.ticket_id}</span> จอดเกินเวลาที่กำหนดไป <span className="font-bold text-rose-600">{fineModal.diffHours} ชั่วโมง</span>
            </p>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex justify-between items-center text-xs mb-4">
              <span className="text-rose-700 font-medium">ค่าปรับเกินเวลาคงค้าง:</span>
              <span className="font-bold text-rose-600 text-base">{fineModal.totalFine} บาท</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center mb-5">
              <span className="text-[11px] font-semibold text-slate-600 block mb-2">สแกน QR Code เพื่อชำระค่าปรับ</span>
              <div className="w-36 h-36 bg-white border border-slate-200 rounded-xl mx-auto flex items-center justify-center overflow-hidden p-2 shadow-2xs">
                <img 
                  src="/3Gdbm1.png" 
                  alt="QR Code สำหรับชำระค่าปรับ" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/150?text=Place+QR+Here';
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2">สแกนชำระเงินค่าปรับแล้วกดยืนยันเพื่อคืนช่องจอด</p>
            </div>

            <button
              onClick={() => processCheckOut(fineModal.ticket, fineModal.totalFine)}
              className="w-full h-11 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
            >
              ชำระค่าปรับ {fineModal.totalFine} บาท และคืนช่องจอด
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
'use client'

export default function StatusSection({
  currentUser,
  userTickets,
  searchPlate,
  setSearchPlate,
  fetchUserTickets,
  handleCheckOutSlot
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs max-w-2xl mx-auto">
      <h2 className="text-base font-bold text-slate-800 mb-1">ตรวจสอบสถานะการจองที่จอดรถ</h2>
      <p className="text-xs text-slate-400 mb-4">
        {currentUser ? `แสดงรายการจองทั้งหมดของคุณ (${currentUser.username})` : 'กรุณาเข้าสู่ระบบเพื่อดูตั๋วการจอง'}
      </p>

      {/* ช่องค้นหาเฉพาะในตั๋วของตนเอง */}
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
  )
}
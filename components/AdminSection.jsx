'use client'

export default function AdminSection({
  slots,
  totalRevenue,
  totalParkingRevenue,
  totalFines,
  inputFirstRate,
  setInputFirstRate,
  inputNextRate,
  setInputNextRate,
  inputFineRate,
  setInputFineRate,
  handleUpdatePricing,
  isUpdatingRate,
  adminFloor,
  setAdminFloor,
  adminZone,
  setAdminZone,
  bulkCount,
  setBulkCount,
  handleBulkCreateSlots,
  uniqueFloors,
  adminManageFloor,
  setAdminManageFloor,
  adminAvailableZones,
  adminManageZone,
  setAdminManageZone,
  filteredAdminSlots,
  selectedSlotIds,
  handleSelectAllInCurrentZone,
  handleToggleSelectSlot,
  handleDeleteSlot,
  handleBulkUpdateStatus,
  handleBulkDeleteSlots,
  paymentsList
}) {
  return (
    <div className="space-y-6">
      
      {/* 📊 สรุปภาพรวมช่องจอด และ ยอดเงินการเงิน */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-slate-200 rounded-2xl text-center shadow-xs">
          <span className="text-xs text-slate-400 block mb-1">ช่องจอดทั้งหมด</span>
          <p className="text-2xl font-bold text-slate-800">{slots.length}</p>
          <span className="text-[10px] text-emerald-600 mt-1 block">ว่าง {slots.filter(s => s.status === 'AVAILABLE').length} ช่อง</span>
        </div>

        <div className="bg-white p-4 border border-slate-200 rounded-2xl text-center shadow-xs">
          <span className="text-xs text-slate-400 block mb-1">รายได้รวมทั้งหมด</span>
          <p className="text-2xl font-bold text-[#52B762]">{totalRevenue.toLocaleString()} ฿</p>
          <span className="text-[10px] text-slate-400 mt-1 block">ยอดบริการจอด + ค่าปรับ</span>
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
        <p className="text-xs text-slate-400 mb-4">ข้อมูลธุรกรรมการชำระเงินจากตาราง payments / parking_transactions</p>

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
                paymentsList.map((pay, idx) => (
                  <tr key={pay.payment_id || `pay-${idx}`} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-semibold text-slate-700">{pay.ticket_id}</td>
                    <td className="p-3 font-bold text-slate-800">{pay.parking_transactions?.license_plate || '-'}</td>
                    <td className="p-3 font-bold text-[#52B762]">{pay.parking_transactions?.slot_id || '-'}</td>
                    <td className="p-3 font-bold text-slate-900">{pay.amount} ฿</td>
                    <td className="p-3">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-semibold">
                        {pay.payment_method || 'QR_PROMPTPAY'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">{pay.paid_at ? new Date(pay.paid_at).toLocaleString('th-TH') : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
'use client'

export default function BookingSection({
  slots,
  rate,
  uniqueFloors,
  bookingFloor,
  setBookingFloor,
  bookingZone,
  setBookingZone,
  bookingAvailableZones,
  filteredBookingSlots,
  selectedSlot,
  setSelectedSlot,
  onOpenBookingModal
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
      {/* HEADER BAR SUMMARY */}
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
        <div className="text-center py-12 text-xs text-slate-400">
          ยังไม่มีข้อมูลช่องจอดในระบบ (ให้ Admin เพิ่มช่องจอดก่อน)
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* 1. ปุ่มกดเลือกชั้น (Floor Selector) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700 block mb-2.5">
              <i className="fa-solid fa-layer-group text-[#52B762] mr-1.5"></i> 1. เลือกชั้นที่ต้องการจอด:
            </span>
            <div className="flex flex-wrap gap-2">
              {uniqueFloors.map(floor => (
                <button
                  key={floor}
                  onClick={() => setBookingFloor(floor)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    bookingFloor === floor
                      ? 'bg-[#52B762] text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  ชั้น {floor}
                </button>
              ))}
            </div>
          </div>

          {/* 2. ปุ่มกดเลือกโซน (Zone Selector) */}
          {bookingAvailableZones.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700 block mb-2.5">
                <i className="fa-solid fa-grip text-[#52B762] mr-1.5"></i> 2. เลือกโซนในชั้น {bookingFloor}:
              </span>
              <div className="flex flex-wrap gap-2">
                {bookingAvailableZones.map(zone => (
                  <button
                    key={zone}
                    onClick={() => setBookingZone(zone)}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                      bookingZone === zone
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

          {/* 3. ตารางแสดงช่องจอดตามชั้นและโซนที่เลือก */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700">
                3. เลือกช่องจอดบน <span className="text-[#52B762]">ชั้น {bookingFloor} • โซน {bookingZone}</span> ({filteredBookingSlots.length} ช่อง)
              </span>
            </div>

            {filteredBookingSlots.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">ไม่พบช่องจอดในโซนนี้</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {filteredBookingSlots.map(s => {
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
                          : 'bg-white border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700'
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
            )}
          </div>

        </div>
      )}

      {/* BOTTOM FOOTER SELECTION BAR */}
      <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-6">
        <span className="text-xs font-medium text-slate-700">
          ตำแหน่งที่เลือก: {selectedSlot ? (
            <span className="font-bold text-[#52B762]">
              ชั้น {selectedSlot.floor_no} • โซน {selectedSlot.zone_code} (ช่อง {selectedSlot.slot_id})
            </span>
          ) : 'กรุณาเลือกช่องจอดว่าง'}
        </span>
        <button
          disabled={!selectedSlot}
          onClick={onOpenBookingModal}
          className="px-6 py-2.5 bg-[#52B762] hover:bg-[#439E51] text-white text-xs font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-all"
        >
          ดำเนินการจอง
        </button>
      </div>
    </div>
  )
}
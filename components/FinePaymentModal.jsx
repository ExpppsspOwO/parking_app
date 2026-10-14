'use client'

export default function FinePaymentModal({ fineModal, setFineModal, processCheckOut }) {
  if (!fineModal.isOpen) return null

  return (
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
  )
}
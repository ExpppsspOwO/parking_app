'use client'

export default function AlertModal({ alertModal, onClose, onConfirm }) {
  if (!alertModal.isOpen) return null

  const isConfirm = alertModal.type === 'confirm'

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
      {/* Container พร้อม Pop-in Animation */}
      <div className="bg-white border border-slate-200 w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center transform transition-all duration-300 animate-[popIn_0.22s_ease-out]">
        <style jsx>{`
          @keyframes popIn {
            0% { opacity: 0; transform: scale(0.82); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}</style>
        
        {/* ไอคอนทรงกลมตรงกลาง */}
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            alertModal.type === 'error'
              ? 'bg-rose-100 text-rose-600'
              : alertModal.type === 'confirm'
              ? 'bg-amber-100 text-amber-600'
              : 'bg-emerald-100 text-[#52B762]'
          }`}
        >
          <i
            className={`fa-solid ${
              alertModal.type === 'error'
                ? 'fa-xmark text-3xl'
                : alertModal.type === 'confirm'
                ? 'fa-circle-question text-3xl'
                : 'fa-check text-3xl'
            }`}
          ></i>
        </div>

        <h3 className="text-base font-bold text-slate-800 mb-1">{alertModal.title}</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">{alertModal.message}</p>

        {/* แยกตามประเภท Alert หรือ Confirm */}
        {isConfirm ? (
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-all"
            >
              ยกเลิก
            </button>
            <button
              onClick={() => {
                if (onConfirm) onConfirm()
                onClose()
              }}
              className="flex-1 h-11 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
            >
              ยืนยัน
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            className={`w-full h-11 text-white text-xs font-semibold rounded-xl transition-all shadow-xs ${
              alertModal.type === 'error' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#52B762] hover:bg-[#439E51]'
            }`}
          >
            ตกลง
          </button>
        )}
      </div>
    </div>
  )
}
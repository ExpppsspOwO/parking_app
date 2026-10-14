'use client'

export default function UserManagementSection({
  usersList,
  currentUser,
  fetchUsers,
  handleOpenEditUser,
  handleDeleteUser,
  editingUser,
  setEditingUser,
  editUsername,
  setEditUsername,
  editPassword,
  setEditPassword,
  editPhone,
  setEditPhone,
  editRole,
  setEditRole,
  handleSaveUser
}) {
  return (
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

      {/* MODAL แก้ไขข้อมูลผู้ใช้งาน */}
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

    </div>
  )
}
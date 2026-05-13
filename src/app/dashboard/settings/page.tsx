"use client";

import { useState, useEffect } from "react";
import {
  getUsers,
  registerUser,
  getShops,
  updateUserById,
  deleteUserById,
  getBackupEmails,
  addBackupEmail,
  deleteBackupEmail,
  downloadBackup
} from "@/apiCalls";
import { toast } from "react-hot-toast";
import {
  Plus,
  Trash2,
  Mail,
  User,
  Lock,
  Store,
  Shield,
  Edit,
  Send,
  UserCheck,
  Database,
  Users,
  ChevronRight,
  Search,
  RefreshCw,
  MoreVertical,
  Key
} from "lucide-react";
import DashboardLayout from "@/components/dashboardLayout";
import { motion, AnimatePresence } from "framer-motion";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"users" | "backups">("users");
  const [users, setUsers] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
    shop_id: "",
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [backupEmails, setBackupEmails] = useState<any[]>([]);
  const [newBackupEmail, setNewBackupEmail] = useState("");
  const [loadingBackupEmails, setLoadingBackupEmails] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, shopsRes, backupsRes] = await Promise.all([
        getUsers().catch(() => ({ data: [] })),
        getShops().catch(() => ({ data: [] })),
        getBackupEmails().catch(() => ({ data: [] }))
      ]);

      setUsers(usersRes.data);
      setShops(shopsRes.data);
      setBackupEmails(backupsRes.data);
    } catch (err) {
      toast.error("Failed to sync settings data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveUser = async () => {
    if (!newUser.name || !newUser.email) {
      toast.error("Name and Email are required");
      return;
    }

    if (!editingId && !newUser.password) {
      toast.error("Password is required for new accounts");
      return;
    }

    try {
      if (editingId) {
        const payload: any = {
          full_name: newUser.name,
          role: newUser.role,
          shop_id: newUser.shop_id || null
        };
        if (newUser.password) payload.password = newUser.password;

        const res = await updateUserById(editingId, payload);
        toast.success("Account updated successfully");
        setUsers(prev => prev.map(u => u.id === editingId ? { ...res.data, plain_password: newUser.password || u.plain_password } : u));
      } else {
        const res = await registerUser({
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role,
          shop_id: newUser.shop_id || undefined,
        });
        const created = res.data;
        created.plain_password = newUser.password;
        setUsers(prev => [created, ...prev]);
        toast.success("New account registered");
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Connection failure");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setNewUser({ name: "", email: "", password: "", role: "staff", shop_id: "" });
  };

  const openEditModal = (user: any) => {
    setEditingId(user.id);
    setNewUser({
      name: user.full_name,
      email: user.email,
      password: "",
      role: user.role,
      shop_id: user.shop_id || ""
    });
    setShowModal(true);
  };

  const deleteUserHandler = async (id: string) => {
    const userToDelete = users.find(u => u.id === id);
    if (!confirm(`Permanently remove ${userToDelete?.full_name}?`)) return;

    try {
      await deleteUserById(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success("User access revoked");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Removal failed");
    }
  };

  const handleAddBackupEmail = async () => {
    if (!newBackupEmail) return;
    setLoadingBackupEmails(true);
    try {
      const res = await addBackupEmail(newBackupEmail);
      setBackupEmails(prev => [...prev, res.data]);
      setNewBackupEmail("");
      toast.success("Backup recipient added");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to add email");
    } finally {
      setLoadingBackupEmails(false);
    }
  };

  const handleDeleteBackupEmail = async (id: string) => {
    try {
      await deleteBackupEmail(id);
      setBackupEmails(prev => prev.filter(e => e.id !== id));
      toast.success("Recipient removed");
    } catch (err) {
      toast.error("Operation failed");
    }
  };

  const handleTriggerBackup = async () => {
    try {
      const toastId = toast.loading("Executing system backup...");
      const res = await downloadBackup({ email_backup: true });
      if (res.data.success) {
        toast.success("Backup dispatched to all recipients", { id: toastId });
      } else {
        toast.error("Backup process terminated", { id: toastId });
      }
    } catch (error) {
      toast.error("System backup failed");
    }
  };

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <main className="p-6 lg:p-10 max-w-[1400px] mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Settings</h1>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Global Configuration Center</p>
          </div>

          <div className="flex p-1 bg-slate-100 rounded-xl">
            <TabButton
              active={activeTab === "users"}
              onClick={() => setActiveTab("users")}
              icon={<Users size={16} />}
              label="User Access"
            />
            <TabButton
              active={activeTab === "backups"}
              onClick={() => setActiveTab("backups")}
              icon={<Database size={16} />}
              label="System Backup"
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "users" ? (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Find accounts by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  />
                </div>
                <button
                  onClick={() => { resetForm(); setShowModal(true); }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
                >
                  <Plus size={18} />
                  Provision Account
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Profile</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Permit Level</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Shop Node</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Secret Key</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ops</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm uppercase">
                                {u.full_name?.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-sm">{u.full_name}</div>
                                <div className="text-xs text-slate-400 font-medium">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <RoleBadge role={u.role} />
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-600">
                            {shops.find((s) => s.id === u.shop_id)?.name || <span className="text-slate-300">N/A</span>}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 font-mono text-xs font-black text-slate-700 bg-slate-100 px-2 py-1 rounded-md w-fit">
                              <Key size={10} className="text-slate-400" />
                              {u.plain_password || "••••••••"}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditModal(u)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-blue-600 transition-all"><Edit size={16} /></button>
                              <button onClick={() => deleteUserHandler(u.id)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-rose-500 transition-all"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="backups"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Communication Nodes</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Automated Backup Distribution</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-6">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        placeholder="Register email recipient..."
                        value={newBackupEmail}
                        onChange={(e) => setNewBackupEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 transition-all"
                      />
                    </div>
                    <button
                      onClick={handleAddBackupEmail}
                      disabled={loadingBackupEmails || !newBackupEmail}
                      className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-blue-100"
                    >
                      {loadingBackupEmails ? <RefreshCw className="animate-spin" size={18} /> : "Link Email"}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {backupEmails.map((email) => (
                      <div key={email.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-sm transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                            <Mail size={14} />
                          </div>
                          <span className="text-sm font-bold text-slate-700">{email.email}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteBackupEmail(email.id)}
                          className="p-2 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {backupEmails.length === 0 && (
                      <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <Mail className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No recipients listed</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-200">
                  <Shield className="w-8 h-8 text-blue-400 mb-4" />
                  <h3 className="text-lg font-black tracking-tight mb-2">Manual Dispatch</h3>
                  <p className="text-sm text-slate-400 font-medium mb-6">
                    Force immediate database synchronization and dispatch encrypted archives to all verified nodes.
                  </p>
                  <button
                    onClick={handleTriggerBackup}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-black text-sm transition-all active:scale-[0.98] shadow-lg shadow-blue-900/20"
                  >
                    <Send size={16} />
                    Synchronize Now
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL */}
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
              >
                <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      {editingId ? "Modify Account" : "Access Provisioning"}
                    </h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Credentials Configuration</p>
                  </div>
                  <RoleBadge role={newUser.role} />
                </div>

                <div className="p-8 space-y-5">
                  <InputField
                    label="Legal Identity"
                    value={newUser.name}
                    onChange={(v) => setNewUser({ ...newUser, name: v })}
                    icon={<User size={16} />}
                    placeholder="Full identity string"
                  />
                  <InputField
                    label="Digital Terminal (Email)"
                    value={newUser.email}
                    onChange={(v) => setNewUser({ ...newUser, email: v })}
                    icon={<Mail size={16} />}
                    placeholder="Digital address"
                    disabled={!!editingId}
                  />
                  <InputField
                    label="Access Key (Password)"
                    value={newUser.password}
                    onChange={(v) => setNewUser({ ...newUser, password: v })}
                    icon={<Lock size={16} />}
                    placeholder={editingId ? "Update key (blank for current)" : "Provision access key"}
                  />

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Permit Level</label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                          value={newUser.role}
                          onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none appearance-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 transition-all"
                        >
                          <option value="admin">Admin</option>
                          <option value="subadmin">Subadmin</option>
                          <option value="manager">Manager</option>
                          <option value="staff">Staff</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Assigned Unit</label>
                      <div className="relative">
                        <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                          value={newUser.shop_id}
                          onChange={(e) => setNewUser({ ...newUser, shop_id: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none appearance-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 transition-all"
                        >
                          <option value="">N/A (Global)</option>
                          {shops.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-6">
                    <button
                      onClick={() => setShowModal(false)}
                      className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                    >
                      Abort
                    </button>
                    <button
                      onClick={handleSaveUser}
                      className="flex-[1.5] py-3 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
                    >
                      <UserCheck size={18} />
                      Commit Access
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </DashboardLayout>
  );
}

const TabButton = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-black transition-all ${active ? 'bg-white text-slate-900 shadow-sm shadow-slate-200' : 'text-slate-400 hover:text-slate-600'
      }`}
  >
    {icon}
    {label}
  </button>
);

const RoleBadge = ({ role }: { role: string }) => {
  const configs: any = {
    admin: "bg-rose-50 text-rose-600 border-rose-100",
    manager: "bg-blue-50 text-blue-600 border-blue-100",
    staff: "bg-slate-100 text-slate-600 border-slate-200",
    subadmin: "bg-indigo-50 text-indigo-600 border-indigo-100",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${configs[role] || configs.staff}`}>
      {role}
    </span>
  );
};

const InputField = ({ label, value, onChange, icon, placeholder, disabled }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
}) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{label}</label>
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 transition-all disabled:opacity-50"
      />
    </div>
  </div>
);

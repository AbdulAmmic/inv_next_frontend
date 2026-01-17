"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { getUsers, registerUser, getShops, updateUserById } from "@/apiCalls";
import { toast } from "react-toastify";
import {
  Plus,
  Trash,
  Mail,
  User,
  Lock,
  Store,
  Shield,
  Edit,
} from "lucide-react";

export default function UsersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [users, setUsers] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
    shop_id: "",
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  // ============================
  // LOAD USERS + SHOPS
  // ============================
  const loadData = async () => {
    try {
      const [u, s] = await Promise.all([getUsers(), getShops()]);
      setUsers(u.data);
      setShops(s.data);
    } catch (err) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ============================
  // CREATE USER
  // ============================
  // ============================
  // SAVE USER (CREATE / EDIT)
  // ============================
  const handleSaveUser = async () => {
    if (!newUser.name || !newUser.email) {
      toast.error("Name and Email are required");
      return;
    }

    if (!editingId && !newUser.password) {
      toast.error("Password is required for new users");
      return;
    }

    try {
      if (editingId) {
        // UPDATE
        const payload: any = {
          full_name: newUser.name,
          phone: "", // Add phone if needed
          role: newUser.role,
          shop_id: newUser.shop_id || null
        };
        // Only sending password if changed
        if (newUser.password) {
          payload.password = newUser.password;
        }

        const res = await updateUserById(editingId, payload);
        const updated = res.data;
        // Optimization: locally update the list
        setUsers(prev => prev.map(u => u.id === editingId ? { ...updated, plain_password: newUser.password || u.plain_password } : u));
        toast.success("User updated successfully");

      } else {
        // CREATE
        const response = await registerUser({
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role,
          shop_id: newUser.shop_id || undefined,
        });
        const created = response.data;
        created.plain_password = newUser.password;
        setUsers((prev) => [created, ...prev]);
        toast.success("User created successfully");
      }

      setShowModal(false);
      resetForm();

    } catch (err: any) {
      toast.error(err.response?.data?.error || "Operation failed");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setNewUser({
      name: "",
      email: "",
      password: "",
      role: "staff",
      shop_id: "",
    });
  };

  const openEditModal = (user: any) => {
    setEditingId(user.id);
    setNewUser({
      name: user.full_name,
      email: user.email,
      password: "", // Don't show hash
      role: user.role,
      shop_id: user.shop_id || ""
    });
    setShowModal(true);
  };

  // ============================
  // DELETE USER
  // ============================
  //   const deleteUserHandler = async (id: string) => {
  //     if (!confirm("Are you sure you want to delete this user?")) return;

  //     try {
  //       await deleteUser(id);
  //       setUsers((prev) => prev.filter((u) => u.id !== id));
  //       toast.success("User deleted");
  //     } catch (err: any) {
  //       toast.error(err.response?.data?.error || "Failed to delete");
  //     }
  //   };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isMobile={false}
      />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Users</h1>
              <p className="text-gray-600">Manage system users</p>
            </div>

            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4" />
              New User
            </button>
          </div>

          {/* TABLE */}
          <div className="bg-white p-6 rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Role</th>
                  <th className="p-3 text-left">Shop</th>
                  <th className="p-3 text-left text-red-600">Password (Visible)</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{u.full_name}</td>
                    <td className="p-3">{u.email}</td>

                    <td className="p-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium 
                          ${u.role === "admin"
                            ? "bg-red-100 text-red-700"
                            : u.role === "manager"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="p-3">
                      {shops.find((s) => s.id === u.shop_id)?.name || "-"}
                    </td>

                    {/* PASSWORD (VISIBLE) */}
                    <td className="p-3 font-semibold text-gray-900">
                      {u.plain_password || "—"}
                    </td>

                    <td className="p-3">
                      <button
                        // onClick={() => deleteUserHandler(u.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash className="w-4" />
                      </button>

                      <button
                        onClick={() => openEditModal(u)}
                        className="text-blue-600 hover:text-blue-800 ml-3"
                      >
                        <Edit className="w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        </main>
      </div>

      {/* =======================
          ADD USER MODAL
      ======================== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-xl p-6 shadow-xl">

            <h2 className="text-xl font-bold mb-4">{editingId ? "Edit User" : "Create User"}</h2>

            <div className="space-y-4">

              {/* NAME */}
              <div>
                <label className="text-sm text-gray-600">Full Name</label>
                <div className="flex items-center bg-gray-50 border rounded-lg p-2">
                  <User className="w-4 text-gray-400 mr-2" />
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, name: e.target.value })
                    }
                    className="flex-1 bg-transparent outline-none"
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div>
                <label className="text-sm text-gray-600">Email</label>
                <div className="flex items-center bg-gray-50 border rounded-lg p-2">
                  <Mail className="w-4 text-gray-400 mr-2" />
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    className="flex-1 bg-transparent outline-none"
                    disabled={!!editingId}
                  />
                </div>
              </div>

              {/* PASSWORD (VISIBLE) */}
              <div>
                <label className="text-sm text-gray-600">Password</label>
                <div className="flex items-center bg-gray-50 border rounded-lg p-2">
                  <Lock className="w-4 text-gray-400 mr-2" />
                  <input
                    type="text" // 👈 PASSWORD VISIBLE
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    className="flex-1 bg-transparent outline-none"
                    placeholder={editingId ? "Leave blank to keep current" : "Enter password"}
                  />
                </div>
              </div>

              {/* ROLE */}
              <div>
                <label className="text-sm text-gray-600">Role</label>
                <div className="flex items-center bg-gray-50 border rounded-lg p-2">
                  <Shield className="w-4 text-gray-400 mr-2" />
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                    className="flex-1 bg-transparent outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                    <option value="subadmin">Sub Admin</option>
                  </select>
                </div>
              </div>

              {/* SHOP */}
              <div>
                <label className="text-sm text-gray-600">Shop</label>
                <div className="flex items-center bg-gray-50 border rounded-lg p-2">
                  <Store className="w-4 text-gray-400 mr-2" />
                  <select
                    value={newUser.shop_id}
                    onChange={(e) =>
                      setNewUser({ ...newUser, shop_id: e.target.value })
                    }
                    className="flex-1 bg-transparent outline-none"
                  >
                    <option value="">No shop</option>
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* BUTTONS */}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingId ? "Save Changes" : "Create User"}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

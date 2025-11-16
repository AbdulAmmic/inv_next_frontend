"use client";

import { useEffect, useState } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { getUsers, getShops, registerUser } from "@/apiCalls";
import { toast } from "react-toastify";

import {
  Plus,
  User,
  Mail,
  Shield,
  Store,
  Lock,
  X,
} from "lucide-react";

interface UserType {
  id: string;
  full_name: string;
  email: string;
  role: string;
  shop_id?: string | null;
  phone?: string | null;
  is_active: boolean;
}

interface ShopType {
  id: string;
  name: string;
}

export default function UsersSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [users, setUsers] = useState<UserType[]>([]);
  const [shops, setShops] = useState<ShopType[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);

  const [newUser, setNewUser] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "staff",
    shop_id: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const usersRes = await getUsers();
      const shopsRes = await getShops();
      setUsers(usersRes.data);
      setShops(shopsRes.data);
    } catch (err) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  // CREATE USER
  const handleAddUser = async () => {
    if (!newUser.full_name || !newUser.email || !newUser.password) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const payload: any = {
        name: newUser.full_name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
      };

      if (newUser.shop_id) {
          payload.shop_id = newUser.shop_id;
      }

      const res = await registerUser(payload);

      toast.success("User created successfully!");
      setShowAddModal(false);

      setUsers((prev) => [...prev, res.data.user]);

      setNewUser({
        full_name: "",
        email: "",
        password: "",
        role: "staff",
        shop_id: "",
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create user");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading Users...
      </div>
    );
  }

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

          {/* HEADER */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Users</h1>
              <p className="text-gray-600">Manage system users & permissions</p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
            >
              <Plus className="w-4" /> Add User
            </button>
          </div>

          {/* USERS TABLE */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Role</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Shop</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="p-4">{u.full_name}</td>
                    <td className="p-4">{u.email}</td>
                    <td className="p-4 capitalize">{u.role}</td>
                    <td className="p-4">
                      {shops.find((s) => s.id === u.shop_id)?.name || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ADD USER MODAL */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white w-full max-w-lg p-6 rounded-xl shadow-lg relative">
                
                <button
                  onClick={() => setShowAddModal(false)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5" />
                </button>

                <h2 className="text-xl font-bold mb-4">Add New User</h2>

                <div className="flex flex-col gap-4">

                  {/* FULL NAME */}
                  <div>
                    <label className="text-sm text-gray-600">Full Name</label>
                    <div className="flex items-center bg-gray-50 border rounded-lg p-2">
                      <User className="w-4 text-gray-400 mr-2" />
                      <input
                        value={newUser.full_name}
                        onChange={(e) =>
                          setNewUser({ ...newUser, full_name: e.target.value })
                        }
                        className="flex-1 bg-transparent outline-none"
                        placeholder="Enter full name"
                      />
                    </div>
                  </div>

                  {/* EMAIL */}
                  <div>
                    <label className="text-sm text-gray-600">Email</label>
                    <div className="flex items-center bg-gray-50 border rounded-lg p-2">
                      <Mail className="w-4 text-gray-400 mr-2" />
                      <input
                        value={newUser.email}
                        onChange={(e) =>
                          setNewUser({ ...newUser, email: e.target.value })
                        }
                        className="flex-1 bg-transparent outline-none"
                        placeholder="Enter email"
                      />
                    </div>
                  </div>

                  {/* PASSWORD (VISIBLE AS REQUESTED) */}
                  <div>
                    <label className="text-sm text-gray-600">Password</label>
                    <div className="flex items-center bg-gray-50 border rounded-lg p-2">
                      <Lock className="w-4 text-gray-400 mr-2" />
                      <input
                        type="text"   // 👈 visible password as you requested
                        value={newUser.password}
                        onChange={(e) =>
                          setNewUser({ ...newUser, password: e.target.value })
                        }
                        className="flex-1 bg-transparent outline-none"
                        placeholder="Enter password"
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
                      </select>
                    </div>
                  </div>

                  {/* SHOP */}
                  <div>
                    <label className="text-sm text-gray-600">Assign Shop (Optional)</label>
                    <div className="flex items-center bg-gray-50 border rounded-lg p-2">
                      <Store className="w-4 text-gray-400 mr-2" />
                      <select
                        value={newUser.shop_id}
                        onChange={(e) =>
                          setNewUser({ ...newUser, shop_id: e.target.value })
                        }
                        className="flex-1 bg-transparent outline-none"
                      >
                        <option value="">— No Shop —</option>
                        {shops.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* SAVE BUTTON */}
                  <button
                    onClick={handleAddUser}
                    className="w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 mt-3"
                  >
                    Create User
                  </button>

                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

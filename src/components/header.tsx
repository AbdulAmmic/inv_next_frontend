"use client";

import { useState, useEffect } from "react";
import { Moon, Sun, Bell, Search, ChevronDown, Settings, LogOut, User, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { getShops } from "@/apiCalls";

export default function Header() {
  const router = useRouter();

  const [darkMode, setDarkMode] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);

  // ---------------------------
  // GET USER FROM LOCALSTORAGE
  // ---------------------------
  const userRaw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user = userRaw ? JSON.parse(userRaw) : null;

  const fullName = user?.full_name || "User";
  const userEmail = user?.email || "unknown";
  const userRole = user?.role || "manager";

  // For admin: get selected shop from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("selected_shop_id");
    if (saved) setSelectedShop(saved);
  }, []);

  // -----------------------------------------------------
  // LOAD SHOPS ONLY IF THE USER IS ADMIN
  // -----------------------------------------------------
  const loadShops = async () => {
    if (userRole !== "admin") return;
    try {
      const res = await getShops();
      setShops(res.data);
    } catch (err) {
      console.error("Failed to load shops:", err);
    }
  };

  useEffect(() => {
    loadShops();
  }, []);

  // -----------------------------------------------------
  // CHANGE SHOP (ADMIN ONLY)
  // -----------------------------------------------------
  const handleShopChange = (e: any) => {
    const shopId = e.target.value;
    setSelectedShop(shopId);
    localStorage.setItem("selected_shop_id", shopId);
    window.location.reload(); // refresh dashboards live
  };

  const navigate = (path: string) => router.push(path);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">

      {/* LEFT SIDE */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/dashboard/pos")}
          className="bg-blue-600 text-white px-3 py-2 rounded-lg shadow hover:bg-blue-700 transition"
        >
          POS
        </button>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-700">
          <button onClick={() => navigate("/dashboard/stores")} className="hover:text-blue-600">Stores</button>
          <button className="hover:text-blue-600">AI</button>
        </nav>
      </div>

      {/* SEARCH BAR */}
      <div className="flex-1 mx-6 max-w-md relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search anything..."
          className="w-full pl-10 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-4">

        {/* ADMIN SHOP SWITCHER */}
        {userRole === "admin" && (
          <div className="relative">
            <Store className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <select
              value={selectedShop || ""}
              onChange={handleShopChange}
              className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Select Shop</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Notifications */}
        <button className="p-2 hover:bg-gray-100 rounded-lg relative">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Dark Mode */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          {darkMode ? <Sun className="w-5 h-5 text-gray-600" /> : <Moon className="w-5 h-5 text-gray-600" />}
        </button>

        {/* PROFILE */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2"
          >
            <div className="w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <ChevronDown className={`w-4 h-4 transition ${profileOpen ? "rotate-180" : ""}`} />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-white shadow-lg rounded-xl border border-gray-100 py-3 z-50">
              <div className="px-4 pb-3 border-b">
                <div className="text-gray-900 font-medium">{fullName}</div>
                <div className="text-gray-500 text-sm">{userEmail}</div>
                <div className="text-xs mt-1 text-blue-600 font-semibold uppercase">{userRole}</div>
              </div>

              <button
                onClick={() => navigate("/dashboard/profile")}
                className="flex items-center w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                <User className="w-4 h-4 mr-3" /> Profile
              </button>

              <button
                onClick={() => navigate("/dashboard/settings")}
                className="flex items-center w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                <Settings className="w-4 h-4 mr-3" /> Settings
              </button>

              <button
                onClick={() => {
                  localStorage.clear();
                  router.push("/login");
                }}
                className="flex items-center w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 border-t"
              >
                <LogOut className="w-4 h-4 mr-3" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

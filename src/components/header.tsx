"use client";

import { useState, useEffect } from "react";
import {
  Moon,
  Sun,
  Bell,
  Search,
  ChevronDown,
  Settings,
  LogOut,
  User,
  Store,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getShops, api } from "@/apiCalls";

export default function Header() {
  const router = useRouter();

  const [darkMode, setDarkMode] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [shops, setShops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string>("");

  // ============================
  // LOAD USER FROM LOCALSTORAGE
  // ============================
  const userRaw =
    typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user = userRaw ? JSON.parse(userRaw) : null;

  const fullName = user?.full_name || "User";
  const userEmail = user?.email || "unknown";
  const userRole = user?.role || "staff";
  const userShopId = user?.shop_id || null;

  // ============================
  // INITIAL SHOP SELECTION
  // ============================
  useEffect(() => {
    const saved = localStorage.getItem("selected_shop_id");

    if (userRole === "admin") {
      if (saved) setSelectedShop(saved);
    } else {
      if (userShopId) {
        setSelectedShop(userShopId);
        localStorage.setItem("selected_shop_id", userShopId);
      }
    }
  }, []);

  // ============================
  // LOAD SHOPS (ALL ROLES)
  // ============================
  const loadShops = async () => {
    try {
      const res = await getShops();
      setShops(res.data);

      // ADMIN → Select first shop if none saved
      if (userRole === "admin") {
        const saved = localStorage.getItem("selected_shop_id");
        if (!saved && res.data.length > 0) {
          const first = res.data[0].id;
          setSelectedShop(first);
          localStorage.setItem("selected_shop_id", first);
        }
      } else {
        // ALL OTHER ROLES → force their assigned shop
        if (userShopId) {
          setSelectedShop(userShopId);
          localStorage.setItem("selected_shop_id", userShopId);
        }
      }
    } catch (err) {
      console.error("Error loading shops:", err);
    }
  };

  useEffect(() => {
    loadShops();
  }, []);

  // ============================
  // LOAD SHOP NAME FOR NON-ADMIN
  // ============================
  useEffect(() => {
    if (!selectedShop) return;

    if (userRole !== "admin") {
      api
        .get(`/shops/${selectedShop}`)
        .then((res) => setShopName(res.data.name))
        .catch(() => setShopName("My Shop"));
    }
  }, [selectedShop]);

  // ============================
  // SHOP SWITCH HANDLER
  // ============================
  const handleShopChange = (e: any) => {
    const shopId = e.target.value;
    setSelectedShop(shopId);
    localStorage.setItem("selected_shop_id", shopId);
    window.location.reload();
  };

  const navigate = (path: string) => router.push(path);

  // ============================
  // RENDER HEADER
  // ============================
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
          <button onClick={() => navigate("/dashboard/stores")} className="hover:text-blue-600">
            Stores
          </button>
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

        {/* SHOP SELECTOR (visible for ALL, switch only for admin) */}
        <div className="relative">
          <Store className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />

          <select
            value={selectedShop || ""}
            onChange={handleShopChange}
            disabled={userRole !== "admin"}
            className={`pl-8 pr-3 py-1.5 border rounded-lg text-sm
              ${
                userRole !== "admin"
                  ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                  : "bg-gray-50"
              }
            `}
          >
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

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
          {darkMode ? (
            <Sun className="w-5 h-5 text-gray-600" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600" />
          )}
        </button>

        {/* PROFILE DROPDOWN */}
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
                <div className="text-xs mt-1 text-blue-600 font-semibold uppercase">
                  {userRole}
                </div>
              </div>

              <button className="flex items-center w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
                <User className="w-4 h-4 mr-3" /> Profile
              </button>

              {userRole === "admin" && (
                <button
                  onClick={() => navigate("/dashboard/settings")}
                  className="flex items-center w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  <Settings className="w-4 h-4 mr-3" /> Settings
                </button>
              )}

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

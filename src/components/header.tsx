"use client";

import { useState, useEffect, useRef } from "react";
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
  Menu,
  X,
  ShoppingCart,
  Home,
  BarChart3,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { getShops, api } from "@/apiCalls";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const profileRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const [darkMode, setDarkMode] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [shops, setShops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string>("");

  // Load user from localStorage
  const userRaw =
    typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user = userRaw ? JSON.parse(userRaw) : null;

  const fullName = user?.full_name || "User";
  const userEmail = user?.email || "unknown";
  const userRole = user?.role || "staff";
  const userShopId = user?.shop_id || null;
  const userInitial = fullName.charAt(0).toUpperCase();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initial shop selection
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

  // Load shops
  const loadShops = async () => {
    try {
      const res = await getShops();
      setShops(res.data);

      if (userRole === "admin") {
        const saved = localStorage.getItem("selected_shop_id");
        if (!saved && res.data.length > 0) {
          const first = res.data[0].id;
          setSelectedShop(first);
          localStorage.setItem("selected_shop_id", first);
        }
      } else {
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

  // Load shop name for non-admin
  useEffect(() => {
    if (!selectedShop) return;
    if (userRole !== "admin") {
      api
        .get(`/shops/${selectedShop}`)
        .then((res) => setShopName(res.data.name))
        .catch(() => setShopName("My Shop"));
    }
  }, [selectedShop]);

  // Shop change handler
  const handleShopChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const shopId = e.target.value;
    setSelectedShop(shopId);
    localStorage.setItem("selected_shop_id", shopId);
    window.location.reload();
  };

  const navigate = (path: string) => {
    router.push(path);
    setMobileMenuOpen(false);
    setSearchOpen(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log("Searching for:", searchQuery);
      // Implement search functionality here
      setSearchQuery("");
      setSearchOpen(false);
    }
  };

  const navItems = [
    { label: "Dashboard", icon: <Home className="w-4 h-4" />, path: "/dashboard" },
    { label: "Stores", icon: <Store className="w-4 h-4" />, path: "/dashboard/stores" },
    { label: "POS", icon: <ShoppingCart className="w-4 h-4" />, path: "/dashboard/pos" },
    { label: "Analytics", icon: <BarChart3 className="w-4 h-4" />, path: "/dashboard/analytics" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-100 px-4 md:px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          {/* LEFT SIDE - Logo & Mobile Menu */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg md:hidden"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-gray-700" />
              ) : (
                <Menu className="w-5 h-5 text-gray-700" />
              )}
            </button>

            {/* Logo/Brand */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <Store className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900 hidden sm:inline">Tuhanas</span>
            </div>

            {/* POS Button - Mobile Only */}
            <button
              onClick={() => navigate("/dashboard/pos")}
              className="md:hidden bg-blue-600 text-white p-2 rounded-lg shadow hover:bg-blue-700 transition"
            >
              <ShoppingCart className="w-5 h-5" />
            </button>
          </div>

          {/* CENTER - Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.path
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          {/* RIGHT SIDE - Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Search Button - Mobile */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg md:hidden"
            >
              <Search className="w-5 h-5 text-gray-600" />
            </button>

            {/* Desktop Search */}
            <form
              onSubmit={handleSearch}
              className="hidden md:flex items-center relative w-64 lg:w-80"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products, orders, customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </form>

            {/* Shop Selector - Desktop */}
            {shops.length > 0 && (
              <div className="hidden md:block relative min-w-[140px]">
                <Store className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <select
                  value={selectedShop || ""}
                  onChange={handleShopChange}
                  disabled={userRole !== "admin"}
                  className={`w-full pl-8 pr-3 py-2 text-sm border rounded-lg appearance-none truncate ${
                    userRole !== "admin"
                      ? "bg-gray-100 text-gray-600 cursor-not-allowed"
                      : "bg-white hover:border-gray-300"
                  }`}
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id} className="truncate">
                      {s.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="hidden sm:flex p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-gray-600" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {/* Notifications */}
            <button
              className="p-2 hover:bg-gray-100 rounded-lg relative transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 hover:bg-gray-100 rounded-lg p-1 transition-colors"
                aria-label="Profile menu"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-medium">
                  {userInitial}
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform ${
                    profileOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white shadow-xl rounded-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="font-semibold text-gray-900">{fullName}</div>
                    <div className="text-sm text-gray-500 truncate">{userEmail}</div>
                    <div className="mt-1 text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full inline-block font-medium">
                      {userRole.toUpperCase()}
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <button
                      onClick={() => navigate("/dashboard/profile")}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User className="w-4 h-4 mr-3 text-gray-400" />
                      Profile
                    </button>

                    <button
                      onClick={() => navigate("/dashboard/settings")}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="w-4 h-4 mr-3 text-gray-400" />
                      Settings
                    </button>

                    <button
                      onClick={() => setDarkMode(!darkMode)}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors md:hidden"
                    >
                      {darkMode ? (
                        <Sun className="w-4 h-4 mr-3 text-gray-400" />
                      ) : (
                        <Moon className="w-4 h-4 mr-3 text-gray-400" />
                      )}
                      {darkMode ? "Light Mode" : "Dark Mode"}
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-100 pt-1">
                    <button
                      onClick={() => {
                        localStorage.clear();
                        router.push("/login");
                      }}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {searchOpen && (
          <div className="mt-3 md:hidden">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search anything..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile Menu Sidebar */}
      <div
        ref={mobileMenuRef}
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-gray-900">Tuhanas POS</div>
              <div className="text-xs text-gray-500">{fullName}</div>
            </div>
          </div>
        </div>

        {/* Shop Selector - Mobile */}
        {shops.length > 0 && (
          <div className="p-4 border-b border-gray-100">
            <label className="block text-xs font-medium text-gray-500 mb-2">ACTIVE STORE</label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedShop || ""}
                onChange={handleShopChange}
                disabled={userRole !== "admin"}
                className={`w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg ${
                  userRole !== "admin"
                    ? "bg-gray-100 text-gray-600"
                    : "bg-white"
                }`}
              >
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="p-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium mb-1 ${
                pathname === item.path
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <div className={`p-1.5 rounded-lg ${pathname === item.path ? 'bg-blue-100' : 'bg-gray-100'}`}>
                {item.icon}
              </div>
              {item.label}
            </button>
          ))}
        </nav>

      
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-100">
          <div className="text-xs text-gray-500 mb-2">Account</div>
          <div className="text-sm text-gray-700">{userEmail}</div>
          <div className="text-xs text-blue-600 font-medium mt-1">{userRole.toUpperCase()}</div>
        </div>
      </div>
    </>
  );
}
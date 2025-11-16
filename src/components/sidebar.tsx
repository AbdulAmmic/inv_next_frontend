"use client";

import {
  Home,
  Folder,
  Calendar,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  Menu,
  BarChart3,
  FileText,
  MessageSquare,
  CreditCard,
  Package,
  ShoppingCart,
  DollarSign
} from "lucide-react";
import Link from "next/link";

interface SidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isOpen, isMobile, toggleSidebar }: SidebarProps) {
  const menuItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard", active: true },
    { icon: Package, label: "Products", href: "/dashboard/products" },
    { icon: DollarSign, label: "Stock", href: "/dashboard/stock" },
    { icon: Folder, label: "Categories", href: "/dashboard/categories" },
    { icon: Users, label: "Customers", href: "/dashboard/customers" },
    { icon: BarChart3, label: "Finances", href: "/dashboard/finances" },
    { icon: FileText, label: "Suppliers", href: "/dashboard/suppliers" },
    { icon: ShoppingCart, label: "Sales", href: "/dashboard/sales" },
    { icon: CreditCard, label: "Out of Stock", href: "/dashboard/out-of-stock" },
    { icon: DollarSign, label: "Purchases", href: "/dashboard/purchases" },
    { icon: DollarSign, label: "Expenses", href: "/dashboard/expenses" },
  ];

  const bottomMenuItems = [
    { icon: Settings, label: "Settings", href: "/dashboard/settings" },
    { icon: HelpCircle, label: "Help & Support", href: "/dashboard/help" },
    { icon: LogOut, label: "Logout", href: "/logout" },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative top-0 left-0 z-40 h-screen
        flex flex-col bg-white border-r border-gray-200
        transition-all duration-300 ease-in-out
        ${isMobile ? (isOpen ? 'translate-x-0' : '-translate-x-full') : ''}
        ${isOpen ? 'w-64' : 'w-20'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {isOpen && (
            <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Tuhanas
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isMobile ? (
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            ) : isOpen ? (
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            ) : (
              <Menu className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* Navigation */}
  <nav className="flex-1 px-3 py-4 space-y-1">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className={`
                flex items-center rounded-lg px-3 py-3 text-sm font-medium
                transition-colors
                ${item.active 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <item.icon className={`w-5 h-5 ${isOpen ? 'mr-3' : ''}`} />
              {isOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Bottom navigation */}
        <div className="p-3 border-t border-gray-200">
          {bottomMenuItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="flex items-center rounded-lg px-3 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <item.icon className={`w-5 h-5 ${isOpen ? 'mr-3' : ''}`} />
              {isOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </div>
      </aside>

      {/* Mobile menu button */}
      {isMobile && !isOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed bottom-4 left-4 z-40 p-3 bg-white rounded-full shadow-lg md:hidden"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
      )}
    </>
  );
}
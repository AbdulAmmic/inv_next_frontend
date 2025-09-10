"use client";

import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Users, 
  DollarSign, 
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  CreditCard
} from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  change: number;
  changeType: 'positive' | 'negative';
  chartData?: number[];
}

function StatCard({ title, value, icon, change, changeType, chartData }: StatCardProps) {
  // Simple bar chart visualization
  const maxValue = chartData ? Math.max(...chartData) : 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded p-6 border border-gray-100 shadow hover:shadow-md transition-all duration-300 group"
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
        </div>
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 group-hover:from-blue-100 group-hover:to-blue-200 transition-colors">
          {icon}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className={`flex items-center text-sm font-medium ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
          {changeType === 'positive' ? (
            <ArrowUpRight className="w-4 h-4 mr-1" />
          ) : (
            <ArrowDownRight className="w-4 h-4 mr-1" />
          )}
          <span>{change}%</span>
        </div>
        
        {/* Mini bar chart */}
        {chartData && (
          <div className="flex items-end h-8 gap-1">
            {chartData.map((value, index) => (
              <div
                key={index}
                className="w-2 bg-blue-100 rounded-t-full transition-all duration-300 hover:bg-blue-300"
                style={{ height: `${(value / maxValue) * 100}%` }}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function DashboardStats() {
  const statsData = [
    {
      title: "Total Products",
      value: "1,248",
      icon: <Package className="w-5 h-5 text-blue-600" />,
      change: 12.5,
      changeType: 'positive' as const,
      chartData: [30, 40, 35, 50, 49, 60, 70]
    },
    {
      title: "Active Customers",
      value: "856",
      icon: <Users className="w-5 h-5 text-green-600" />,
      change: 8.2,
      changeType: 'positive' as const,
      chartData: [40, 30, 45, 35, 55, 50, 60]
    },
    {
      title: "Total Revenue",
      value: "$24,563",
      icon: <DollarSign className="w-5 h-5 text-purple-600" />,
      change: 15.3,
      changeType: 'positive' as const,
      chartData: [20, 25, 30, 35, 40, 45, 50]
    },
    {
      title: "Out of Stock",
      value: "23",
      icon: <ShoppingCart className="w-5 h-5 text-red-600" />,
      change: -3.1,
      changeType: 'negative' as const,
      chartData: [60, 50, 45, 40, 35, 30, 25]
    }
  ];

  // Staggered animation for cards
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5"
    >
      {statsData.map((stat, index) => (
        <StatCard
          key={index}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          change={stat.change}
          changeType={stat.changeType}
          chartData={stat.chartData}
        />
      ))}
    </motion.div>
  );
}
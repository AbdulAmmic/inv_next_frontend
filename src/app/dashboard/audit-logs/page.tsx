"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    ClipboardList, RefreshCw, Search, Filter,
    User, Activity, Database, Calendar, Clock,
    ArrowUpDown, ShieldAlert, FileText, Info,
    Download, Mail
} from "lucide-react";
import { getAuditLogs, downloadBackup } from "@/apiCalls";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import Loader from "@/components/Loader";
import { toast } from "react-hot-toast";

interface AuditLog {
    id: string;
    user_id: string;
    user_name: string;
    action: string;
    resource: string;
    resource_id: string;
    meta: any;
    created_at: string;
}

interface FilterState {
    search: string;
    user: string;
    action: string;
    resource: string;
    startDate: string;
    endDate: string;
}

export default function AuditLogsPage() {
    const router = useRouter();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showFilters, setShowFilters] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'created_at',
        direction: 'desc'
    });

    const [filters, setFilters] = useState<FilterState>({
        search: "",
        user: "all",
        action: "all",
        resource: "all",
        startDate: "",
        endDate: ""
    });

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await getAuditLogs();
            setLogs(res.data || []);
        } catch (error) {
            console.error("Failed to fetch audit logs:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
            const parsed = JSON.parse(savedUser);
            if (parsed.role !== "admin") {
                router.push("/dashboard");
                return;
            }
            setIsAdmin(true);
        } else {
            router.push("/");
            return;
        }

        fetchLogs();
    }, [router]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchLogs();
    };

    const handleDownloadBackup = async () => {
        try {
            toast.loading("Preparing backup...", { id: "backup-download" });
            const res = await downloadBackup();

            const dataStr = JSON.stringify(res.data, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = `tuhanas_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success("Backup downloaded!", { id: "backup-download" });
        } catch (error) {
            console.error("Backup download failed:", error);
            toast.error("Failed to generate backup", { id: "backup-download" });
        }
    };

    const handleEmailBackup = async () => {
        try {
            toast.loading("Sending backup to email...", { id: "backup-email" });
            const res = await downloadBackup({ email_backup: true });
            if (res.data.success) {
                toast.success(res.data.message || "Backup sent to your email!", { id: "backup-email" });
            } else {
                toast.error("Failed to send email", { id: "backup-email" });
            }
        } catch (error) {
            console.error("Backup email failed:", error);
            toast.error("Error sending backup email", { id: "backup-email" });
        }
    };

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const filteredLogs = logs.filter(log => {
        // Search filter (meta or resource_id)
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const metaStr = JSON.stringify(log.meta).toLowerCase();
            if (!log.resource_id?.toLowerCase().includes(searchLower) &&
                !metaStr.includes(searchLower) &&
                !log.user_name.toLowerCase().includes(searchLower)) {
                return false;
            }
        }

        // User filter
        if (filters.user !== "all" && log.user_name !== filters.user) {
            return false;
        }

        // Action filter
        if (filters.action !== "all" && log.action !== filters.action) {
            return false;
        }

        // Resource filter
        if (filters.resource !== "all" && log.resource !== filters.resource) {
            return false;
        }

        // Date range filter
        if (filters.startDate || filters.endDate) {
            const logDate = new Date(log.created_at);

            if (filters.startDate) {
                const startDate = new Date(filters.startDate);
                if (logDate < startDate) return false;
            }

            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999);
                if (logDate > endDate) return false;
            }
        }

        return true;
    });

    const sortedLogs = [...filteredLogs].sort((a, b) => {
        const direction = sortConfig.direction === 'asc' ? 1 : -1;

        if (sortConfig.key === 'created_at') {
            return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction;
        }

        const valA = (a as any)[sortConfig.key]?.toString().toLowerCase() || "";
        const valB = (b as any)[sortConfig.key]?.toString().toLowerCase() || "";

        return valA.localeCompare(valB) * direction;
    });

    const uniqueUsers = Array.from(new Set(logs.map(l => l.user_name))).filter(Boolean);
    const uniqueActions = Array.from(new Set(logs.map(l => l.action))).filter(Boolean);
    const uniqueResources = Array.from(new Set(logs.map(l => l.resource))).filter(Boolean);

    if (!isAdmin || loading) {
        return <Loader text={!isAdmin ? "Redirecting..." : "Loading audit logs..."} />;
    }

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100">
            <Sidebar isOpen={true} toggleSidebar={() => { }} isMobile={false} />

            <div className="flex-1 flex flex-col">
                <Header />

                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="mb-8">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-md">
                                        <ClipboardList className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Audit Logs</h1>
                                        <p className="text-gray-600 mt-1">
                                            Track all administrative and system activities.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={handleDownloadBackup}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                                >
                                    <Download className="w-4 h-4" />
                                    Download Backup
                                </button>

                                <button
                                    onClick={handleEmailBackup}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                                >
                                    <Mail className="w-4 h-4" />
                                    Email Me Backup
                                </button>

                                <button
                                    onClick={handleRefresh}
                                    disabled={refreshing}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
                                >
                                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                    Refresh
                                </button>

                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                                >
                                    <Filter className="w-4 h-4" />
                                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                                </button>
                            </div>
                        </div>

                        {/* Filters Section */}
                        {showFilters && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Search */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                            <Search className="w-4 h-4 text-gray-400" />
                                            Search Details / Resource ID
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. SKU-12345, update_user..."
                                            value={filters.search}
                                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
                                        />
                                    </div>

                                    {/* User Filter */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                            <User className="w-4 h-4 text-gray-400" />
                                            User
                                        </label>
                                        <select
                                            value={filters.user}
                                            onChange={(e) => setFilters({ ...filters, user: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
                                        >
                                            <option value="all">All Users</option>
                                            {uniqueUsers.map(u => (
                                                <option key={u} value={u}>{u}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Action Filter */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-gray-400" />
                                            Action
                                        </label>
                                        <select
                                            value={filters.action}
                                            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
                                        >
                                            <option value="all">All Actions</option>
                                            {uniqueActions.map(a => (
                                                <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Resource Filter */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                            <Database className="w-4 h-4 text-gray-400" />
                                            Resource
                                        </label>
                                        <select
                                            value={filters.resource}
                                            onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
                                        >
                                            <option value="all">All Resources</option>
                                            {uniqueResources.map(r => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Date From */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            From Date
                                        </label>
                                        <input
                                            type="date"
                                            value={filters.startDate}
                                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
                                        />
                                    </div>

                                    {/* Date To */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            To Date
                                        </label>
                                        <input
                                            type="date"
                                            value={filters.endDate}
                                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={() => setFilters({
                                            search: "",
                                            user: "all",
                                            action: "all",
                                            resource: "all",
                                            startDate: "",
                                            endDate: ""
                                        })}
                                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                    >
                                        Reset Filters
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Logs Table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="p-4 text-left">
                                                <button onClick={() => handleSort('created_at')} className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                                                    Timestamp <ArrowUpDown className="w-3 h-3" />
                                                </button>
                                            </th>
                                            <th className="p-4 text-left">
                                                <button onClick={() => handleSort('user_name')} className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                                                    User <ArrowUpDown className="w-3 h-3" />
                                                </button>
                                            </th>
                                            <th className="p-4 text-left">
                                                <button onClick={() => handleSort('action')} className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                                                    Action <ArrowUpDown className="w-3 h-3" />
                                                </button>
                                            </th>
                                            <th className="p-4 text-left">
                                                <button onClick={() => handleSort('resource')} className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                                                    Resource <ArrowUpDown className="w-3 h-3" />
                                                </button>
                                            </th>
                                            <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                Details
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {sortedLogs.length > 0 ? (
                                            sortedLogs.map((log) => (
                                                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="p-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {new Date(log.created_at).toLocaleDateString()}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                {new Date(log.created_at).toLocaleTimeString()}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center">
                                                                <User className="w-4 h-4 text-indigo-600" />
                                                            </div>
                                                            <span className="text-sm text-gray-700 font-medium">
                                                                {log.user_name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${log.action.includes('delete') ? 'bg-red-50 text-red-700 border border-red-100' :
                                                            log.action.includes('create') ? 'bg-green-50 text-green-700 border border-green-100' :
                                                                log.action.includes('update') ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                                                    'bg-gray-50 text-gray-700 border border-gray-100'
                                                            }`}>
                                                            {log.action.replace(/_/g, ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-600">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-gray-900">{log.resource}</span>
                                                            <span className="text-xs font-mono text-gray-400 truncate max-w-[120px]" title={log.resource_id}>
                                                                ID: {log.resource_id || "N/A"}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="max-w-xs overflow-hidden">
                                                                <p className="text-xs text-gray-500 truncate" title={JSON.stringify(log.meta)}>
                                                                    {JSON.stringify(log.meta)}
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={() => alert(JSON.stringify(log.meta, null, 2))}
                                                                className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                                                            >
                                                                <Info className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="p-12 text-center text-gray-500">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <ShieldAlert className="w-12 h-12 text-gray-200" />
                                                        <p className="text-lg font-medium">No audit logs found</p>
                                                        <p className="text-sm">Try adjusting your filters or check back later.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                                <p>Showing {sortedLogs.length} activity records</p>
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="w-3 h-3" />
                                    <span>Secure administrative access logged</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

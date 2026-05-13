"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import DashboardLayout from "@/components/dashboardLayout";
import { RefreshCw, CheckCircle2, AlertCircle, Database, ArrowRight, History } from "lucide-react";
import { motion } from "framer-motion";
import { pushChanges } from "@/syncEngine";
import { useState } from "react";
import { toast } from "react-hot-toast";

export default function SyncPage() {
  const pendingItems = useLiveQuery(() => db.sync_queue.where("status").equals("pending").toArray());
  const syncedItems = useLiveQuery(() => db.sync_queue.where("status").equals("synced").limit(50).reverse().toArray());
  const failedItems = useLiveQuery(() => db.sync_queue.where("status").equals("failed").toArray());
  
  const [syncing, setSyncing] = useState(false);

  const handleManualSync = async () => {
    if (!navigator.onLine) {
      toast.error("No internet connection!");
      return;
    }
    setSyncing(true);
    try {
      await pushChanges();
      toast.success("Sync started");
    } catch (err) {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <DashboardLayout>
      <main className="p-6 lg:p-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Data Synchronization</h1>
            <p className="text-slate-500 font-medium mt-1">Monitor and manage offline data sync</p>
          </div>
          
          <button
            onClick={handleManualSync}
            disabled={syncing || !navigator.onLine}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white rounded-xl px-6 py-2.5 text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync Now
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="glass-card p-6 rounded-2xl border-l-4 border-l-indigo-500 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Pending</p>
                <div className="p-2 bg-indigo-50 rounded-lg"><RefreshCw className="w-5 h-5 text-indigo-500" /></div>
              </div>
              <h2 className="text-3xl font-black text-slate-900 mt-2">{pendingItems?.length || 0}</h2>
              <p className="text-xs text-slate-400 mt-1">Awaiting upload</p>
           </div>
           
           <div className="glass-card p-6 rounded-2xl border-l-4 border-l-emerald-500 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Synced</p>
                <div className="p-2 bg-emerald-50 rounded-lg"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></div>
              </div>
              <h2 className="text-3xl font-black text-slate-900 mt-2">{syncedItems?.length || 0}</h2>
              <p className="text-xs text-slate-400 mt-1">Last 50 successful</p>
           </div>

           <div className="glass-card p-6 rounded-2xl border-l-4 border-l-rose-500 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Failed</p>
                <div className="p-2 bg-rose-50 rounded-lg"><AlertCircle className="w-5 h-5 text-rose-500" /></div>
              </div>
              <h2 className="text-3xl font-black text-slate-900 mt-2">{failedItems?.length || 0}</h2>
              <p className="text-xs text-slate-400 mt-1">Requiring attention</p>
           </div>
        </div>

        {/* Pending Queue */}
        <div className="glass-card rounded-[2rem] overflow-hidden border border-slate-100 shadow-xl">
          <div className="px-6 py-5 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-500" />
              Pending Queue
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/30 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <th className="px-6 py-4">Entity</th>
                  <th className="px-6 py-4">Operation</th>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pendingItems?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400 font-medium italic">
                      No pending changes. Everything is in sync!
                    </td>
                  </tr>
                ) : (
                  pendingItems?.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-700 capitalize">{item.entity}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          item.operation === 'CREATE' ? 'bg-emerald-50 text-emerald-600' :
                          item.operation === 'UPDATE' ? 'bg-indigo-50 text-indigo-600' :
                          'bg-rose-50 text-rose-600'
                        }`}>
                          {item.operation}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-[10px] text-slate-400">{item.entityId}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(item.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent History */}
        <div className="glass-card rounded-[2rem] overflow-hidden border border-slate-100 shadow-xl opacity-80">
          <div className="px-6 py-5 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              Recent Sync History
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/30 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <th className="px-6 py-4">Entity</th>
                  <th className="px-6 py-4">Operation</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {syncedItems?.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-600 capitalize">{item.entity}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">{item.operation}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-[10px] uppercase">
                        <CheckCircle2 className="w-3 h-3" />
                        Synced
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[10px] text-slate-400">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}

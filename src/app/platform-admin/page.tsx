"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { resolveApiBase } from "@/apiBase";

export default function PlatformAdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // This page is reachable without ever visiting the dashboard, so it can't
  // rely on anything else having run URL discovery — on a fresh browser the
  // synchronous getApiBase() would still be the built-in fallback (a dead
  // tunnel hostname) and login would fail with "could not reach the server".
  useEffect(() => {
    resolveApiBase(true).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Always resolve (coalesced/rate-limited internally) so we post to the
      // live API URL even if discovery hadn't finished when the page loaded.
      const base = await resolveApiBase();
      const res = await axios.post(`${base}/platform/auth/login`, {
        email: email.trim().toLowerCase(),
        password,
      });
      localStorage.setItem("platform_token", res.data.access_token);
      localStorage.setItem("platform_admin", JSON.stringify(res.data.admin));
      router.replace("/platform-admin/businesses");
    } catch (err: any) {
      setError(
        err?.response?.status === 401
          ? "Incorrect email or password."
          : "Could not reach the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 font-sans">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl"
      >
        <h1 className="text-xl font-bold text-white mb-1">Platform Admin</h1>
        <p className="text-slate-400 text-sm mb-6">Tuhanas SaaS control panel</p>

        <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full mb-4 px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500"
        />

        <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full mb-4 px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500"
        />

        {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}

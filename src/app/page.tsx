"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Send, Sparkles, WifiOff, RefreshCw, Boxes } from "lucide-react";
import { loginUser, api } from "@/apiCalls";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
  cacheLoginCredentials,
  verifyOfflineLogin,
  isNetworkError,
} from "@/offlineAuth";
import { getApiBase, resolveApiBase } from "@/apiBase";
import { refreshBusinessInfo, ensureLocalDataMatchesBusiness } from "@/businessTheme";

export default function LoginPage() {
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [serverWaking, setServerWaking] = useState(false);

  const router = useRouter();

  const validateForm = () => {
    let valid = true;
    const newErrors = { email: "", password: "" };

    if (!formData.email) {
      newErrors.email = "Email is required";
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Enter a valid email";
      valid = false;
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  // Wake server with /health pings, then retry login
  const wakeAndRetry = async (toastId: string): Promise<boolean> => {
    setServerWaking(true);
    toast.loading("Server is starting up — please wait (up to 60s)...", { id: toastId });

    const maxWait = 90000;
    const start = Date.now();
    let attempt = 0;

    while (Date.now() - start < maxWait) {
      attempt++;
      try {
        // Re-discover the API URL first — a "sleeping server" is often
        // actually a restarted tunnel with a new hostname.
        await resolveApiBase();
        await fetch(`${getApiBase()}/health`, { signal: AbortSignal.timeout(8000) });
        // Server is awake — retry login
        toast.loading(`Server ready, signing in...`, { id: toastId });
        setServerWaking(false);
        return true;
      } catch {
        toast.loading(`Connecting to server (attempt ${attempt})...`, { id: toastId });
        await new Promise(r => setTimeout(r, 4000));
      }
    }

    setServerWaking(false);
    return false;
  };

  const doLogin = async (
    toastId: string,
    email: string,
    password: string
  ): Promise<"success" | "auth_error" | "network_error"> => {
    try {
      const response = await loginUser(email, password);
      const data = response.data;

      if (data?.access_token) {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.removeItem("offline_session");

        // This device's local cache (IndexedDB) may hold a different
        // tenant's data from a previous login — wipe it before anything
        // else touches local storage if this login is for a different
        // business, so the dashboard never shows cross-tenant leftovers.
        await ensureLocalDataMatchesBusiness(data.user?.business_id);

        // Cache uses the already-clean email + password
        await cacheLoginCredentials(
          email,
          password,
          data.user,
          data.access_token,
          data.refresh_token
        );

        // Best-effort — the dashboard's own theme (logo/name/color) so the
        // very first paint after login already shows this tenant's
        // branding, not a stale or empty cache.
        refreshBusinessInfo(api).catch(() => {});

        setIsOfflineMode(false);
        toast.success("Welcome back!", { id: toastId });
        setTimeout(() => router.replace("/dashboard"), 800);
        return "success";
      }

      return "auth_error";
    } catch (err: any) {
      // Real auth error (401 = wrong credentials)
      if (err?.response?.status === 401) {
        return "auth_error";
      }
      // Network / timeout (server sleeping)
      if (isNetworkError(err) || err?.code === "ECONNABORTED" || err?.code === "ERR_NETWORK") {
        return "network_error";
      }
      return "auth_error";
    }
  };

  const handleLogin = async () => {
    // Normalise email and password ONCE here, use these throughout — never formData directly
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanPassword = formData.password.trim();

    // Update display state so the input shows the cleaned email
    setFormData((prev) => ({ ...prev, email: cleanEmail }));

    if (!cleanEmail) {
      setErrors((prev) => ({ ...prev, email: "Email is required" }));
      return;
    }
    if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
      setErrors((prev) => ({ ...prev, email: "Enter a valid email" }));
      return;
    }
    if (!cleanPassword) {
      setErrors((prev) => ({ ...prev, password: "Password is required" }));
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Signing in...");

    try {
      // ── Step 1: Try online login ──
      let result = await doLogin(toastId, cleanEmail, cleanPassword);

      if (result === "success") return;

      if (result === "network_error") {
        // ── Step 2: Server might be sleeping — wake it up and retry ──
        const awake = await wakeAndRetry(toastId);

        if (awake) {
          result = await doLogin(toastId, cleanEmail, cleanPassword);
          if (result === "success") return;

          if (result === "auth_error") {
            toast.error("Incorrect email or password.", { id: toastId });
            return;
          }
        }

        // ── Step 3: Server unreachable — try offline cache ──
        toast.loading("Server unreachable — checking offline credentials...", { id: toastId });
        const offlineResult = await verifyOfflineLogin(cleanEmail, cleanPassword);

        if (offlineResult.success) {
          const cached = offlineResult.data;
          localStorage.setItem("access_token", cached.access_token);
          localStorage.setItem("refresh_token", cached.refresh_token);
          localStorage.setItem("user", JSON.stringify(cached.user));
          localStorage.setItem("offline_session", "true");

          setIsOfflineMode(true);
          toast.success("✈️ Signed in offline — cached session restored.", { id: toastId });
          setTimeout(() => router.replace("/dashboard"), 800);
        } else {
          toast.error(
            "Cannot reach server. No offline session available.\nPlease connect to the internet and try again.",
            { id: toastId, duration: 5000 }
          );
        }
        return;
      }

      // ── auth_error: wrong credentials ──
      toast.error("Incorrect email or password.", { id: toastId });

    } finally {
      setLoading(false);
      setServerWaking(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error("Please enter your email address.");
      return;
    }
    toast.success("If an account exists, a reset link has been sent.");
    setForgotEmail("");
    setShowForgot(false);
  };

  const inputCls = (hasError: boolean) =>
    `w-full h-11 pl-10 pr-3 rounded-lg bg-white border text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none disabled:opacity-60 ${
      hasError
        ? "border-rose-400 ring-4 ring-rose-50"
        : "border-slate-200 hover:border-slate-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
    }`;

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-[1.05fr_1fr] bg-white">
      {/* ── Brand panel ─────────────────────────────── */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#17110a] text-white p-12">
        <div className="absolute inset-0 opacity-[0.35] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.09)_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full bg-amber-500/25 blur-[120px]" />
        <div className="absolute -bottom-48 right-[-120px] w-[460px] h-[460px] rounded-full bg-orange-600/20 blur-[120px]" />

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-900/40">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold tracking-tight">Inventory Manager</p>
            <p className="text-[11px] text-white/50 uppercase tracking-[0.18em]">Multi-shop · Offline-first</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-[40px] leading-[1.1] font-semibold tracking-tight">
            Every shelf, sale and expiry date —{" "}
            <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">in one calm place.</span>
          </h2>
          <p className="mt-4 text-white/60 text-[15px] leading-relaxed">
            Run your shops even when the internet drops. Everything syncs the moment you&apos;re back online.
          </p>

          {/* Illustrative preview card (static sample figures) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/50">Today&apos;s sales</p>
              <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-400/10 px-2 py-0.5 rounded-full">+12.4%</span>
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums">₦486,200</p>
            <div className="mt-4 flex items-end gap-1.5 h-16">
              {[38, 52, 44, 63, 58, 72, 66, 84, 78, 92, 86, 100].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.6, delay: 0.35 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex-1 rounded-sm ${i === 11 ? "bg-amber-400" : "bg-white/15"}`}
                />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-white/10 text-xs">
              <div><p className="text-white/40">Low stock</p><p className="font-semibold mt-0.5">7 items</p></div>
              <div><p className="text-white/40">Expiring</p><p className="font-semibold mt-0.5">3 batches</p></div>
              <div><p className="text-white/40">Sync</p><p className="font-semibold mt-0.5 text-emerald-300">Up to date</p></div>
            </div>
          </motion.div>
        </div>

        <p className="relative text-xs text-white/35">© {new Date().getFullYear()} Inventory Manager</p>
      </aside>

      {/* ── Form ───────────────────────────────────── */}
      <main className="relative flex items-center justify-center px-6 py-12 bg-[var(--background)] lg:bg-white">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <p className="font-semibold text-slate-900 tracking-tight">Inventory Manager</p>
          </div>

          {isOfflineMode && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 inline-flex items-center gap-2 bg-amber-50 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-200"
            >
              <WifiOff className="w-3.5 h-3.5" />
              Offline session active
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {!showForgot ? (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
                <p className="text-slate-500 text-sm mt-1.5">Sign in to your account to continue.</p>

                <div className="mt-8 space-y-4" onKeyDown={(e) => e.key === "Enter" && !loading && handleLogin()}>
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-[13px] font-medium text-slate-700">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                      <input
                        id="email"
                        type="email"
                        name="email"
                        autoComplete="email"
                        placeholder="name@company.com"
                        value={formData.email}
                        onChange={handleChange}
                        disabled={loading}
                        className={inputCls(!!errors.email)}
                      />
                    </div>
                    {errors.email && <p className="text-rose-500 text-xs">{errors.email}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label htmlFor="password" className="text-[13px] font-medium text-slate-700">Password</label>
                      <button
                        type="button"
                        onClick={() => setShowForgot(true)}
                        className="text-xs font-medium text-amber-700 hover:text-amber-900"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                        disabled={loading}
                        className={`${inputCls(!!errors.password)} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-rose-500 text-xs">{errors.password}</p>}
                  </div>

                  {serverWaking && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-amber-800 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                      Server is waking up — this can take up to a minute on first load.
                    </motion.div>
                  )}

                  <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full h-11 mt-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Sign in
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="forgot-form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reset password</h1>
                <p className="text-slate-500 text-sm mt-1.5">We&apos;ll send you a link to recover your account.</p>

                <form onSubmit={handleForgotPassword} className="mt-8 space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="forgot-email" className="text-[13px] font-medium text-slate-700">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                      <input
                        id="forgot-email"
                        type="email"
                        required
                        placeholder="name@company.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className={inputCls(false)}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full h-11 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 flex items-center justify-center gap-2"
                  >
                    <Send size={15} />
                    Send reset link
                  </button>
                </form>

                <button
                  onClick={() => setShowForgot(false)}
                  className="mt-5 w-full text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft size={15} />
                  Back to sign in
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-10 text-xs text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> Encrypted connection · works offline after first sign-in
          </p>
        </div>
      </main>
    </div>
  );
}

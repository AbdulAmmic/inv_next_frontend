"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Send, Sparkles, WifiOff, RefreshCw } from "lucide-react";
import { loginUser } from "@/apiCalls";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import Image from "next/image";
import logoTuhanas from "../../public/logo_tuhanas.png";
import {
  cacheLoginCredentials,
  verifyOfflineLogin,
  isNetworkError,
} from "@/offlineAuth";

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
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://inv-flask-api.onrender.com";
    setServerWaking(true);
    toast.loading("Server is starting up — please wait (up to 60s)...", { id: toastId });

    const maxWait = 90000;
    const start = Date.now();
    let attempt = 0;

    while (Date.now() - start < maxWait) {
      attempt++;
      try {
        await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(8000) });
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

  const doLogin = async (toastId: string): Promise<"success" | "auth_error" | "network_error"> => {
    try {
      const response = await loginUser(formData.email, formData.password);
      const data = response.data;

      if (data?.access_token) {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.removeItem("offline_session");

        await cacheLoginCredentials(
          formData.email,
          formData.password,
          data.user,
          data.access_token,
          data.refresh_token
        );

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
    if (!validateForm()) return;

    setLoading(true);
    const toastId = toast.loading("Signing in...");

    try {
      // ── Step 1: Try online login ──
      let result = await doLogin(toastId);

      if (result === "success") return;

      if (result === "network_error") {
        // ── Step 2: Server might be sleeping — wake it up and retry ──
        const awake = await wakeAndRetry(toastId);

        if (awake) {
          result = await doLogin(toastId);
          if (result === "success") return;

          if (result === "auth_error") {
            toast.error("Incorrect email or password.", { id: toastId });
            return;
          }
        }

        // ── Step 3: Server unreachable — try offline cache ──
        toast.loading("Server unreachable — checking offline credentials...", { id: toastId });
        const offlineResult = await verifyOfflineLogin(formData.email, formData.password);

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

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center font-nunito bg-stone-50">
      {/* Background orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-200/40 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-100/50 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-amber-100/40 rounded-full blur-[80px]" />

      <main className="relative z-10 w-full max-w-[440px] px-6">
        {/* Brand/Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex flex-col items-center justify-center mb-4">
            <div className="relative w-48 h-16">
              <Image src={logoTuhanas} alt="Tuhanas Kitchen and Scents" fill className="object-contain" priority />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-amber-900">
            Inventory Management
          </h1>
          <p className="text-amber-700/70 mt-1 text-sm font-medium">
            Smart Multi-Shop Control System
          </p>

          {isOfflineMode && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 inline-flex items-center gap-2 bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1.5 rounded-full border border-orange-200"
            >
              <WifiOff className="w-3.5 h-3.5" />
              Offline Session Active
            </motion.div>
          )}
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="glass-card rounded-[2rem] p-8 md:p-10"
        >
          <AnimatePresence mode="wait">
            {!showForgot ? (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-800">Welcome Back</h2>
                  <p className="text-slate-500 text-sm mt-1">Please enter your details to sign in</p>
                </div>

                <div className="space-y-5" onKeyDown={(e) => e.key === "Enter" && !loading && handleLogin()}>
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-600 transition-colors w-5 h-5" />
                      <input
                        type="email"
                        name="email"
                        placeholder="name@company.com"
                        value={formData.email}
                        onChange={handleChange}
                        disabled={loading}
                        className={`w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/60 border transition-all duration-200 outline-none disabled:opacity-60 ${
                          errors.email
                            ? "border-red-500 ring-red-100 ring-4"
                            : "border-amber-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                        }`}
                      />
                    </div>
                    {errors.email && <p className="text-red-500 text-xs ml-1 mt-1">{errors.email}</p>}
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-sm font-semibold text-slate-700">Password</label>
                      <button
                        type="button"
                        onClick={() => setShowForgot(true)}
                        className="text-xs font-bold text-amber-600 hover:text-amber-800 transition-colors"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-600 transition-colors w-5 h-5" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                        disabled={loading}
                        className={`w-full pl-12 pr-12 py-3.5 rounded-2xl bg-white/60 border transition-all duration-200 outline-none disabled:opacity-60 ${
                          errors.password
                            ? "border-red-500 ring-red-100 ring-4"
                            : "border-amber-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-500 text-xs ml-1 mt-1">{errors.password}</p>}
                  </div>

                  {/* Server waking indicator */}
                  {serverWaking && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-amber-700 text-xs font-medium bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
                    >
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Server is waking up — this takes up to 60 seconds on first load
                    </motion.div>
                  )}

                  {/* Sign In Button */}
                  <motion.button
                    whileHover={{ scale: loading ? 1 : 1.01 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full mt-4 py-4 rounded-2xl bg-amber-500 text-white font-bold shadow-lg shadow-amber-200 hover:bg-amber-600 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Sign In</span>
                        <Sparkles className="w-4 h-4 text-amber-100 group-hover:rotate-12 transition-transform" />
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="forgot-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-800">Reset Password</h2>
                  <p className="text-slate-500 text-sm mt-1">We'll send you a link to recover your account</p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-600 transition-colors w-5 h-5" />
                      <input
                        type="email"
                        required
                        placeholder="name@company.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/60 border border-amber-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full py-4 rounded-2xl bg-amber-500 text-white font-bold shadow-lg shadow-amber-200 hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Send size={18} />
                    <span>Send Reset Link</span>
                  </motion.button>
                </form>

                <button
                  onClick={() => setShowForgot(false)}
                  className="mt-6 w-full text-sm font-bold text-slate-500 hover:text-amber-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back to Login
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <p className="mt-8 text-center text-slate-400 text-xs font-medium">
          Protected by industry standard encryption. <br />
          © 2026 Tuhanas Inventory. v2.0
        </p>
      </main>
    </div>
  );
}

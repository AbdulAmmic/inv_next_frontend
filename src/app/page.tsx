"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Send } from "lucide-react";
import { loginUser } from "@/apiCalls";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // ------------------------------------------------------------
  // VALIDATION
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  // HANDLE INPUT
  // ------------------------------------------------------------
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  // ------------------------------------------------------------
  // LOGIN
  // ------------------------------------------------------------
  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await loginUser(formData.email, formData.password);
      const data = response.data;

      if (data?.access_token) {
        // Save tokens
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        localStorage.setItem("user", JSON.stringify(data.user));

        toast.success("Login successful!");

        // Smooth redirect
        setTimeout(() => {
          router.replace("/dashboard");
        }, 500);
      } else {
        toast.error("Login failed. Try again.");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.error ||
          err.message ||
          "Incorrect email or password"
      );
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------
  // FORGOT PASSWORD (Mocked)
  // ------------------------------------------------------------
  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Password reset link sent to your email");
    setShowForgot(false);
  };

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <ToastContainer position="top-right" autoClose={2500} />

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="rounded-t-xl bg-gradient-to-r from-purple-700 to-indigo-700 px-6 py-8 text-center shadow-xl">
          <h1 className="text-3xl font-bold text-white">Tuhana's Inventory</h1>
          <p className="text-purple-200 mt-2 text-sm">
            {showForgot
              ? "Reset your password"
              : "Smart multi-shop inventory system"}
          </p>
        </div>

        {/* FORM CONTAINER */}
        <motion.div
          initial={{ scale: 0.97 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-b-xl px-6 py-8 shadow-xl"
        >
          <AnimatePresence mode="wait">
            {/* LOGIN SCREEN */}
            {!showForgot ? (
              <motion.div
                key="login"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div
                  className="space-y-6"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                >
                  {/* Email */}
                  <div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500 h-5 w-5" />
                      <input
                        type="email"
                        name="email"
                        placeholder="Email address"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 text-gray-800 border transition-all focus:outline-none ${
                          errors.email
                            ? "border-red-500 focus:ring-2 focus:ring-red-500"
                            : "border-purple-300 focus:ring-2 focus:ring-purple-500"
                        }`}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500 h-5 w-5" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        className={`w-full pl-10 pr-10 py-3 rounded-lg bg-gray-50 text-gray-800 border transition-all focus:outline-none ${
                          errors.password
                            ? "border-red-500 focus:ring-2 focus:ring-red-500"
                            : "border-purple-300 focus:ring-2 focus:ring-purple-500"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-500 hover:text-purple-700"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {/* Forgot Password */}
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-xs text-purple-600 hover:text-purple-800 block text-right"
                  >
                    Forgot password?
                  </button>

                  {/* Login Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full py-3 rounded-lg font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-95 transition disabled:opacity-60"
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              /* FORGOT PASSWORD SCREEN */
              <motion.div
                key="forgot-screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <form onSubmit={handleForgotPassword} className="space-y-6">
                  <p className="text-gray-600 text-sm text-center">
                    Enter your email to receive a reset link.
                  </p>

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500 h-5 w-5" />
                    <input
                      type="email"
                      required
                      placeholder="Email address"
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 text-gray-800 border border-purple-300 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    className="w-full py-3 rounded-lg font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-center gap-2 hover:opacity-90"
                  >
                    <Send size={18} />
                    Send Reset Link
                  </motion.button>
                </form>

                <button
                  onClick={() => setShowForgot(false)}
                  className="mt-4 text-sm text-purple-600 hover:text-purple-800 flex items-center justify-center gap-1"
                >
                  <ArrowLeft size={16} /> Back to Login
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}

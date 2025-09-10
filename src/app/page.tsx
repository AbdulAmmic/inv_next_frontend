"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Send } from "lucide-react";
import Header from "@/components/header";

export default function LoginPage() {
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-2 py-6 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm sm:p-0 bg-transparent rounded-2xl shadow-none"
      >
        {/* Blue Header */}
        <div className="rounded-t-2xl bg-blue-600 px-4 py-6 sm:px-8 text-center shadow-md">
          <h1 className="text-2xl font-bold text-white tracking-tight">Tuhanas Kitchen</h1>
          <p className="text-blue-100 mt-2 text-sm font-light">
            {showForgot
              ? "Reset your password"
              : "Sign in to manage your kitchen inventory"}
          </p>
        </div>
        <motion.div
          initial={{ scale: 0.97 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white/90 rounded-b-2xl px-4 py-8 sm:px-8 shadow-md -mt-2"
        >

        <AnimatePresence mode="wait">
          {!showForgot ? (
            <motion.div
              key="login-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Login Form */}

              <form className="space-y-5 mt-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-300" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200 focus:border-blue-500 transition-all text-base sm:text-sm"
                    autoComplete="email"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-300" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200 focus:border-blue-500 transition-all text-base sm:text-sm"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-blue-500 p-1 rounded"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>


                <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
                  <label className="flex items-center text-gray-500">
                    <input
                      type="checkbox"
                      className="rounded border border-blue-200 text-blue-500 focus:ring-blue-400 accent-blue-500 h-4 w-4"
                    />
                    <span className="ml-2">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-blue-500 hover:text-blue-700 transition-colors px-2 py-1"
                  >
                    Forgot?
                  </button>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  className="w-full py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-none text-base sm:text-sm"
                >
                  Sign In
                </motion.button>
              </form>

              {/* Sign up link */}
              <div className="text-center text-gray-400 text-xs mt-6">
                Don't have an account?{' '}
                <a href="#" className="text-blue-500 hover:text-blue-700 font-medium transition-colors">
                  Create account
                </a>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="forgot-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Forgot Password Form */}
              <form className="space-y-5 mt-2">
                <p className="text-gray-500 text-xs text-center mb-2">
                  Enter your email and we'll send you a reset link.
                </p>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-300" />
                  <input
                    type="email"
                    placeholder="Your email address"
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200 focus:border-blue-500 transition-all text-base sm:text-sm"
                    autoComplete="email"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  className="w-full py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-none text-base sm:text-sm"
                >
                  <Send size={18} />
                  Send Reset Link
                </motion.button>
              </form>
              {/* Back to Login */}
              <button
                onClick={() => setShowForgot(false)}
                className="mt-6 text-xs text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center gap-1 px-2 py-1"
              >
                <ArrowLeft size={16} />
                Back to Login
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}
import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [searchParams] = useSearchParams();

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      const redirect = searchParams.get("redirect");
      navigate(redirect || "/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Segoe UI', sans-serif" }}>

      {/* ── Left Panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #e0f2fe 0%, #b2f5e8 50%, #d1fae5 100%)" }}>

        {/* Decorative circles */}
        <div className="absolute top-[-80px] left-[-80px] w-80 h-80 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #667eea, transparent)" }} />
        <div className="absolute bottom-[-60px] right-[-60px] w-64 h-64 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #38f9d7, transparent)" }} />
      

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
            style={{ background: "linear-gradient(135deg, #667eea 0%, #38f9d7 100%)" }}>
            <span className="text-white text-lg">💸</span>
          </div>
          <span className="text-xl font-bold text-gray-800">SplitSmart</span>
        </div>

        {/* Hero Text */}
        <div className="relative z-10">
          <h2 className="text-5xl font-black text-gray-800 leading-tight mb-6">
            Seamlessly<br />splitting bills.<br />
            <span style={{ color: "#667eea" }}>Every time.</span>
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed max-w-sm">
            SplitSmart makes shared expenses simple and fair. Collaborate on groups,
            track spending, and simplify settle-ups.
          </p>

          {/* Stats */}
          <div className="flex gap-8 mt-10">
            <div>
              <p className="text-3xl font-black text-gray-800">10k+</p>
              <p className="text-gray-500 text-sm mt-1">Active Users</p>
            </div>
            <div>
              <p className="text-3xl font-black text-gray-800">₹2M+</p>
              <p className="text-gray-500 text-sm mt-1">Expenses Tracked</p>
            </div>
            <div>
              <p className="text-3xl font-black text-gray-800">99%</p>
              <p className="text-gray-500 text-sm mt-1">Satisfaction</p>
            </div>
          </div>
        </div>

        {/* Chart decoration */}
        <div className="relative z-10 bg-white bg-opacity-60 backdrop-blur rounded-2xl p-5 shadow-sm w-64">
          <p className="text-xs text-gray-500 font-medium mb-3">Monthly Settlements</p>
          <div className="flex items-end gap-2 h-16">
            {[40, 65, 45, 80, 55, 90, 70, 95].map((h, i) => (
              <div key={i} className="flex-1 rounded-t-md transition-all"
                style={{
                  height: `${h}%`,
                  background: i === 7
                    ? "linear-gradient(180deg, #667eea, #764ba2)"
                    : "linear-gradient(180deg, #b2f5e8, #38f9d7)",
                  opacity: 0.8 + i * 0.025
                }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">

          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
              style={{ background: "linear-gradient(135deg, #667eea 0%, #38f9d7 100%)" }}>
              <span className="text-white text-lg">💸</span>
            </div>
            <span className="text-xl font-bold text-gray-800">SplitSmart</span>
          </div>

          <h1 className="text-4xl font-black text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-500 mb-8">Log in to SplitSmart</p>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  ✉️
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:border-transparent transition text-gray-800"
                  style={{ "--tw-ring-color": "#667eea" }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  🔑
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:border-transparent transition text-gray-800"
                  style={{ "--tw-ring-color": "#667eea" }}
                />
                <button type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl text-white font-bold text-base transition-all hover:opacity-90 hover:shadow-lg mt-2"
              style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2d5986 100%)" }}>
              {loading ? "Signing in..." : "Log In"}
            </button>
          </form>

         

          {/* Register Link */}
          <p className="text-center text-gray-500 mt-8 text-sm">
            Don't have an account?{" "}
            <Link to="/register" className="font-bold hover:underline" style={{ color: "#667eea" }}>
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(name, email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
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
            Join thousands<br />splitting smarter.<br />
            <span style={{ color: "#667eea" }}>Start free.</span>
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed max-w-sm">
            Create your account in seconds. No credit card needed.
            Split fairly with anyone, anywhere.
          </p>

          {/* Features list */}
          <div className="mt-10 space-y-4">
            {[
              { icon: "👥", text: "Create unlimited groups" },
              { icon: "🤖", text: "AI-powered expense scanning" },
              { icon: "⚡", text: "Instant settlement tracking" },
              { icon: "🔔", text: "Smart email notifications" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: "rgba(255,255,255,0.7)" }}>
                  {f.icon}
                </div>
                <span className="text-gray-700 font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial card */}
        <div className="relative z-10 bg-white bg-opacity-60 backdrop-blur rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
              R
            </div>
            <div>
              <p className="text-gray-800 font-semibold text-sm">Rahul M.</p>
              <p className="text-gray-400 text-xs">Goa Trip 2025</p>
            </div>
            <div className="ml-auto text-yellow-400 text-sm">★★★★★</div>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            "SplitSmart saved our friendship! No more awkward money conversations."
          </p>
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

          <h1 className="text-4xl font-black text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-500 mb-8">Start splitting expenses with friends</p>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">👤</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:border-transparent transition text-gray-800"
                  style={{ "--tw-ring-color": "#667eea" }}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">✉️</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
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
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔑</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
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
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

         

          

          {/* Terms */}
          <p className="text-center text-gray-400 text-xs mt-5">
            By creating an account, you agree to our{" "}
            <span className="underline cursor-pointer">Terms of Service</span> &{" "}
            <span className="underline cursor-pointer">Privacy Policy</span>
          </p>

          {/* Login Link */}
          <p className="text-center text-gray-500 mt-4 text-sm">
            Already have an account?{" "}
            <Link to="/login" className="font-bold hover:underline" style={{ color: "#667eea" }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
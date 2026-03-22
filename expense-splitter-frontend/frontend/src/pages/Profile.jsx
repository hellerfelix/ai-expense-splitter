import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { profileAPI } from "../services/api";
import { ArrowLeft, User, Mail, Lock, Eye, EyeOff, LogOut } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleChangePassword = async () => {
    setError("");
    setSuccess("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await profileAPI.changePassword({ currentPassword, newPassword });
      setSuccess("Password changed successfully! 🎉");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (pwd) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const getStrengthLabel = (score) => {
    if (score <= 1) return { label: "Weak", color: "#ef4444" };
    if (score <= 3) return { label: "Medium", color: "#f59e0b" };
    return { label: "Strong", color: "#22c55e" };
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setProfilePhoto(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const strength = getPasswordStrength(newPassword);
  const strengthInfo = getStrengthLabel(strength);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f0f4ff", fontFamily: "'Segoe UI', sans-serif" }}>

      {/* Header Strip */}
      <div className="flex flex-col items-center py-8 relative"
        style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>

        {/* Logo — top left */}
        <div className="absolute top-4 left-6 flex items-center gap-2">
          <div className="w-8 h-8 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
            <span className="text-sm">💸</span>
          </div>
          <span className="text-white font-black text-base">SplitSmart</span>
        </div>

        {/* Back button — top right */}
        <button onClick={() => navigate("/")}
          className="absolute top-4 right-6 flex items-center gap-2 text-xs font-semibold bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-2 rounded-xl transition text-white">
          <ArrowLeft size={14} />
          Back to Dashboard
        </button>

        {/* Avatar */}
        <div className="relative cursor-pointer mt-8" onClick={() => fileInputRef.current?.click()}>
          <div className="w-20 h-20 rounded-full border-4 border-white border-opacity-60 overflow-hidden shadow-xl"
            style={{ background: "linear-gradient(135deg, #a78bfa, #764ba2)" }}>
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-2xl font-black">
                {getInitials(user?.name)}
              </div>
            )}
          </div>
          <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md">
            <span className="text-xs">✏️</span>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*"
          className="hidden" onChange={handlePhotoChange} />
        <h1 className="text-xl font-black text-white mt-3">
          {user?.name?.split(" ")[0]?.toLowerCase()}
        </h1>
      </div>

      {/* Cards — flex-1 so footer sticks to bottom */}
      <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Account Details Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-black text-gray-800 mb-5">Account Details</h2>

            {/* Full Name */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-500 mb-1">Full Name</label>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50">
                <User size={16} className="text-gray-400" />
                <span className="text-gray-800 font-medium flex-1">{user?.name}</span>
              </div>
            </div>

            {/* Email */}
            <div className="mb-2">
              <label className="block text-sm font-semibold text-gray-500 mb-1">Email</label>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50">
                <Mail size={16} className="text-gray-400" />
                <span className="text-gray-800 font-medium flex-1 text-sm">{user?.email}</span>
              </div>
            </div>
          </div>

          {/* Change Security Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-black text-gray-800 mb-1">Change Security</h2>
            <p className="text-gray-400 text-sm mb-5">Update Password</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-xl mb-4 text-sm">
                {success}
              </div>
            )}

            <div className="space-y-4">

              {/* Current Password */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50">
                <Lock size={16} className="text-gray-400" />
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current Password"
                  className="flex-1 bg-transparent focus:outline-none text-gray-800 text-sm"
                />
                <button onClick={() => setShowCurrent(!showCurrent)}
                  className="text-gray-400 hover:text-gray-600">
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* New Password */}
              <div>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50">
                  <Lock size={16} className="text-gray-400" />
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Password"
                    className="flex-1 bg-transparent focus:outline-none text-gray-800 text-sm"
                  />
                  <button onClick={() => setShowNew(!showNew)}
                    className="text-gray-400 hover:text-gray-600">
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password Strength Bar */}
                {newPassword && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex-1 h-1.5 rounded-full transition-all"
                          style={{
                            background: strength >= i * 1.5
                              ? strengthInfo.color
                              : "#e5e7eb"
                          }} />
                      ))}
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: strength <= 1 ? "#ef4444" : "#d1d5db" }}>weak</span>
                      <span style={{ color: strength > 1 && strength <= 3 ? "#f59e0b" : "#d1d5db" }}>medium</span>
                      <span style={{ color: strength > 3 ? "#22c55e" : "#d1d5db" }}>strong</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50">
                <Lock size={16} className="text-gray-400" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm New Password"
                  className="flex-1 bg-transparent focus:outline-none text-gray-800 text-sm"
                />
                <button onClick={() => setShowConfirm(!showConfirm)}
                  className="text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Save Button */}
              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition hover:opacity-90 hover:shadow-lg"
                style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2d5986 100%)" }}>
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer — Sign Out centered at bottom */}
      <div className="w-full flex justify-center pb-8 pt-2">
        <button
          onClick={() => { logout(); navigate("/login"); }}
          className="flex items-center gap-2 text-red-500 hover:text-red-600 text-sm font-bold hover:bg-red-50 px-6 py-2.5 rounded-xl transition"
          style={{ border: "2px solid #fca5a5" }}>
          <LogOut size={15} />
          Sign Out
        </button>
      </div>

    </div>
  );
}
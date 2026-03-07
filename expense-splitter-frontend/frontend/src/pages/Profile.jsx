import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { profileAPI } from "../services/api";
import { ArrowLeft, User, Lock, Eye, EyeOff } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="text-white px-6 py-4"
        style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate("/")}
            className="flex items-center gap-2 text-white text-opacity-80 hover:text-opacity-100 mb-6 transition">
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>

          {/* Avatar */}
          <div className="flex flex-col items-center pb-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold bg-white bg-opacity-20 mb-3">
              {getInitials(user?.name)}
            </div>
            <h1 className="text-2xl font-bold">{user?.name?.split(" ")[0]}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">

        {/* Profile Info Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #667eea20 0%, #764ba220 100%)" }}>
              <User size={18} className="text-purple-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Account Info</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-500 text-sm">Full Name</span>
              <span className="font-semibold text-gray-800">{user?.name}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-500 text-sm">Email</span>
              <span className="font-semibold text-gray-800">{user?.email}</span>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #f093fb20 0%, #f5576c20 100%)" }}>
              <Lock size={18} className="text-pink-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Change Password</h2>
          </div>

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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 pr-12"
                />
                <button onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600">
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 pr-12"
                />
                <button onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600">
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 pr-12"
                />
                <button onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              onClick={handleChangePassword}
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold transition mt-2"
              style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
              {loading ? "Changing..." : "Change Password"}
            </button>
          </div>
        </div>
      </div>
      {/* Logout Card */}
<div className="bg-white rounded-2xl p-6 shadow-sm">
  <p className="text-sm text-gray-500 mb-4">Ready to leave? You can always come back.</p>
  <button
    onClick={() => { logout(); navigate("/login"); }}
    className="flex items-center gap-2 border border-red-400 text-red-300 hover:bg-red-500 hover:text-white px-3 py-2 rounded-xl text-sm font-semibold transition">     Logout
  </button>
</div>
    </div>
  );
}
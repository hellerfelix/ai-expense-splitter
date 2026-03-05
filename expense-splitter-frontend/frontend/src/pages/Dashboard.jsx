import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { Plus, Users, LogOut, Wallet } from "lucide-react";
import { groupAPI, splitAPI } from "../services/api";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [totalUnsettled, setTotalUnsettled] = useState(0);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await groupAPI.getAll();
      setGroups(response.data);
  
      // Fetch balances for all groups and sum up unsettled
      const balancePromises = response.data.map(g =>
        splitAPI.getBalances(g.id).catch(() => null)
      );
      const allBalances = await Promise.all(balancePromises);
      const total = allBalances.reduce((sum, b) =>
        sum + (b?.data?.totalUnsettled || 0), 0
      );
      setTotalUnsettled(Math.round(total * 100) / 100);
    } catch (err) {
      console.error("Failed to fetch groups", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) return;
    setCreating(true);
    try {
      await groupAPI.create(newGroup);
      setShowCreateModal(false);
      setNewGroup({ name: "", description: "" });
      fetchGroups();
    } catch (err) {
      console.error("Failed to create group", err);
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const gradients = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <div className="text-white px-6 py-4 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
            <span className="text-lg">💸</span>
          </div>
          <span className="text-xl font-bold">SplitSmart</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white text-opacity-90">Hey, {user?.name}! 👋</span>
          <button onClick={handleLogout}
            className="flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-2 rounded-xl transition">
            <LogOut size={16} />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">My Groups</h1>
            <p className="text-gray-500 mt-1">Manage your shared expenses</p>
          </div>
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 text-white px-5 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition"
            style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
            <Plus size={20} />
            New Group
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
  <div className="bg-white rounded-2xl p-5 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        <Users size={18} className="text-white" />
      </div>
      <div>
        <p className="text-gray-500 text-sm">Total Groups</p>
        <p className="text-2xl font-bold text-gray-800">{groups.length}</p>
      </div>
    </div>
  </div>
  <div className="bg-white rounded-2xl p-5 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }}>
        <Wallet size={18} className="text-white" />
      </div>
      <div>
        <p className="text-gray-500 text-sm">Total Unsettled</p>
        <p className="text-2xl font-bold text-red-500">
          ₹{totalUnsettled}
        </p>
      </div>
    </div>
  </div>
</div>

        {/* Groups Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏖️</div>
            <h3 className="text-xl font-semibold text-gray-700">No groups yet!</h3>
            <p className="text-gray-500 mt-2">Create a group to start splitting expenses</p>
            <button onClick={() => setShowCreateModal(true)}
              className="mt-6 text-white px-6 py-3 rounded-2xl font-semibold"
              style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
              Create First Group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {groups.map((group, index) => (
              <div key={group.id}
                onClick={() => navigate(`/group/${group.id}`)}
                className="bg-white rounded-2xl shadow-sm hover:shadow-md transition cursor-pointer overflow-hidden card-hover">
                {/* Card Header */}
                <div className="h-24 flex items-center justify-center"
                  style={{ background: gradients[index % gradients.length] }}>
                  <span className="text-4xl">
                    {group.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                {/* Card Body */}
                <div className="p-5">
                  <h3 className="font-bold text-gray-800 text-lg">{group.name}</h3>
                  {group.description && (
                    <p className="text-gray-500 text-sm mt-1 truncate">{group.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <Users size={14} className="text-gray-400" />
                    <span className="text-gray-500 text-sm">
                      {group.totalMembers} member{group.totalMembers !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Group</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="e.g. Goa Trip 2026"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="e.g. Trip expenses for 5 friends"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleCreateGroup} disabled={creating}
                className="flex-1 py-3 rounded-xl text-white font-semibold transition"
                style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                {creating ? "Creating..." : "Create Group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Plus, Users, Clock, TrendingUp, CheckCircle, Activity, TrendingDown, AlertCircle } from "lucide-react";
import { groupAPI, splitAPI, expenseAPI } from "../services/api";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [totalUnsettled, setTotalUnsettled] = useState(0);
  const [totalOwed, setTotalOwed] = useState(0);
  const [groupUnsettled, setGroupUnsettled] = useState({});
  const [groupExpenseCount, setGroupExpenseCount] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [copiedGroupId, setCopiedGroupId] = useState(null);
  
  const [totalOwing, setTotalOwing] = useState(0);
  

  useEffect(() => {
    fetchGroups();
    fetchRecentActivity();
  },[]);

  const fetchGroups = async () => {
    try {
      const response = await groupAPI.getAll();
      setGroups(response.data);

      const balancePromises = response.data.map(g =>
        splitAPI.getBalances(g.id).catch(() => null)
      );
      const expensePromises = response.data.map(g =>
        expenseAPI.getGroupExpenses(g.id).catch(() => null)
      );

      const [allBalances, allExpenses] = await Promise.all([
        Promise.all(balancePromises),
        Promise.all(expensePromises),
      ]);

      const total = allBalances.reduce((sum, b) =>
        sum + (b?.data?.totalUnsettled || 0), 0
      );
      setTotalUnsettled(Math.round(total * 100) / 100);

      const unsettledMap = {};
      const expenseCountMap = {};
      let owed = 0;   // others owe you
      let owing = 0;  // you owe others
      
      response.data.forEach((g, i) => {
        unsettledMap[g.id] = allBalances[i]?.data?.totalUnsettled || 0;
        expenseCountMap[g.id] = allExpenses[i]?.data?.length || 0;
      
        const balances = allBalances[i]?.data?.balances || [];
        balances.forEach(b => {
          if (b.owesToEmail === user?.email) {
            owed += b.totalAmount;
          } else if (b.owesByEmail === user?.email) {
            owing += b.totalAmount;
          }
        });
      });
      
      setGroupUnsettled(unsettledMap);
      setGroupExpenseCount(expenseCountMap);
      setTotalOwed(Math.round(owed * 100) / 100);
      setTotalOwing(Math.round(owing * 100) / 100);
    } catch (err) {
      console.error("Failed to fetch groups", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const res = await expenseAPI.getRecent();
      setRecentActivity(res.data);
    } catch (err) {
      console.error("Failed to fetch recent activity", err);
    } finally {
      setActivityLoading(false);
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
      fetchRecentActivity();
    } catch (err) {
      console.error("Failed to create group", err);
    } finally {
      setCreating(false);
    }
  };

  const getExpenseTypeIcon = (type) => {
    if (type === "RECEIPT_UPLOAD") return "📸";
    if (type === "NATURAL_LANGUAGE") return "💬";
    return "✏️";
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleShareInvite = async (e, groupId) => {
    e.stopPropagation();
    try {
      const res = await groupAPI.generateInviteLink(groupId);
      await navigator.clipboard.writeText(res.data.inviteLink);
      setCopiedGroupId(groupId);
      setTimeout(() => setCopiedGroupId(null), 3000);
    } catch (err) {
      alert("Failed to generate invite link");
    }
  };

  const gradients = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  ];

 // Bug 2: Treat undefined as "not yet loaded" — use explicit null check
const activeGroups = groups.filter(g => (groupUnsettled[g.id] ?? 0) > 0);
const settledGroups = groups.filter(g => g.id in groupUnsettled && groupUnsettled[g.id] === 0);

  return (
    <div className="min-h-screen" style={{ background: "#f0f4ff", fontFamily: "'Segoe UI', sans-serif" }}>

      {/* Navbar */}
      <div className="text-white px-6 py-4 flex items-center justify-between shadow-md"
        style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
            <span className="text-lg">💸</span>
          </div>
          <h1 className="text-xl font-black tracking-tight">SplitSmart</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-white text-opacity-90 text-sm">
            Welcome, <strong>{user?.name?.split(" ")[0]}</strong>
          </span>
          <button onClick={() => navigate("/support")}
            className="text-xs font-semibold bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-2 rounded-xl transition">
            Contact Us
          </button>
          <button onClick={() => navigate("/profile")}
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black bg-white bg-opacity-20 hover:bg-opacity-30 transition border border-white border-opacity-30">
            {user?.name?.charAt(0).toUpperCase()}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Welcome + New Group */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-800">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">Track and manage your shared expenses</p>
          </div>
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition text-sm"
            style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
            <Plus size={16} />
            New Group
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
  {
    label: "Total Groups", value: groups.length,
    icon: <Users size={18} className="text-white" />,
    bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    valueColor: "text-gray-800"
  },
  {
    label: "Total Owed", value: `₹${totalOwed}`,
    icon: <TrendingUp size={18} className="text-white" />,
    bg: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    valueColor: "text-green-600"
  },
  {
    label: "Total Owing", value: `₹${totalOwing}`,
    icon: <TrendingDown size={18} className="text-white" />,
    bg: "linear-gradient(135deg, #f5576c 0%, #f093fb 100%)",
    valueColor: "text-red-500"
  },
  {
    label: "Total Unsettled", value: `₹${totalUnsettled}`,
    icon: <AlertCircle size={18} className="text-white" />,
    bg: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    valueColor: "text-orange-500"
  },
].map((stat, i) => (
  <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
    <div className="flex items-center justify-between mb-3">
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">{stat.label}</p>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: stat.bg }}>
        {stat.icon}
      </div>
    </div>
    <p className={`text-2xl font-black ${stat.valueColor}`}>{stat.value}</p>
  </div>
))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <div className="text-6xl mb-4">🏖️</div>
            <h3 className="text-xl font-bold text-gray-700">No groups yet!</h3>
            <p className="text-gray-500 mt-2 text-sm">Create a group to start splitting expenses</p>
            <button onClick={() => setShowCreateModal(true)}
              className="mt-6 text-white px-6 py-3 rounded-xl font-semibold text-sm"
              style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
              Create First Group
            </button>
          </div>
        ) : (
          <>
            {/* Active + Settled Groups Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

              {/* Active Groups */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #f5576c, #f093fb)" }}>
                      <Activity size={14} className="text-white" />
                    </div>
                    <h2 className="font-bold text-gray-800">Active Groups</h2>
                    <span className="bg-red-100 text-red-500 text-xs font-bold px-2 py-0.5 rounded-full">
                      {activeGroups.length}
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                  {activeGroups.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <p className="text-3xl mb-2">🎉</p>
                      <p className="text-sm">All settled up!</p>
                    </div>
                  ) : activeGroups.map((group, index) => (
                    <div key={group.id}
                      onClick={() => navigate(`/group/${group.id}`)}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm"
                          style={{ background: gradients[index % gradients.length] }}>
                          {group.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{group.name}</p>
                          <p className="text-xs text-gray-400">
                            {group.totalMembers} members · {groupExpenseCount[group.id] || 0} expenses
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-red-500 font-bold text-sm">₹{groupUnsettled[group.id]}</p>
                        <button
                          onClick={(e) => handleShareInvite(e, group.id)}
                          className="text-xs text-purple-500 hover:underline mt-0.5">
                          {copiedGroupId === group.id ? "✅ Copied!" : "🔗 Invite"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Settled Groups */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #43e97b, #38f9d7)" }}>
                      <CheckCircle size={14} className="text-white" />
                    </div>
                    <h2 className="font-bold text-gray-800">Settled Groups</h2>
                    <span className="bg-green-100 text-green-500 text-xs font-bold px-2 py-0.5 rounded-full">
                      {settledGroups.length}
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                  {settledGroups.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <p className="text-3xl mb-2">💸</p>
                      <p className="text-sm">No settled groups yet</p>
                    </div>
                  ) : settledGroups.map((group, index) => (
                    <div key={group.id}
                      onClick={() => navigate(`/group/${group.id}`)}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm"
                          style={{ background: gradients[index % gradients.length] }}>
                          {group.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{group.name}</p>
                          <p className="text-xs text-gray-400">
                            {group.totalMembers} members · {groupExpenseCount[group.id] || 0} expenses
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="bg-green-100 text-green-600 text-xs font-bold px-2 py-1 rounded-full">
                          ✅ Settled
                        </span>
                        <div className="mt-1">
                          <button
                            onClick={(e) => handleShareInvite(e, group.id)}
                            className="text-xs text-purple-500 hover:underline">
                            {copiedGroupId === group.id ? "✅ Copied!" : "🔗 Invite"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            {!activityLoading && recentActivity.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
                    <Clock size={14} className="text-white" />
                  </div>
                  <h2 className="font-bold text-gray-800">Recent Activity</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {recentActivity.map((expense, index) => (
                    <div key={expense.id}
                      onClick={() => navigate(`/group/${expense.groupId}`)}
                      className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base bg-purple-50">
                          {getExpenseTypeIcon(expense.expenseType)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{expense.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {expense.groupName} · Paid by {expense.paidByEmail === user?.email ? "You" : expense.paidBy}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800 text-sm">₹{expense.totalAmount}</p>
                        <p className="text-xs text-gray-400">{timeAgo(expense.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Group</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name *</label>
                <input type="text" value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="e.g. Goa Trip 2026"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" value={newGroup.description}
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
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { groupAPI, expenseAPI, splitAPI } from "../services/api";
import { ArrowLeft, Plus, UserPlus, TrendingUp, Check } from "lucide-react";

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("expenses");
  const [showConfirm, setShowConfirm] = useState(null); // stores balance index
  const [settledBalances, setSettledBalances] = useState([]);
  const [settledHistory, setSettledHistory] = useState([]);

useEffect(() => {
  const key = `settled_${id}`;
  const saved = JSON.parse(localStorage.getItem(key) || "[]");
  setSettledHistory(saved);
}, [id]);

  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState("");

  useEffect(() => {
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    try {
      const [groupRes, expenseRes, balanceRes] = await Promise.all([
        groupAPI.getById(id),
        expenseAPI.getGroupExpenses(id),
        splitAPI.getBalances(id),
      ]);
      setGroup(groupRes.data);
      setExpenses(expenseRes.data);
      setBalances(balanceRes.data);
    } catch (err) {
      console.error("Failed to fetch group details", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!memberEmail.trim()) return;
    setAddingMember(true);
    setMemberError("");
    try {
      await groupAPI.addMember(id, { email: memberEmail });
      setShowAddMember(false);
      setMemberEmail("");
      fetchAll();
    } catch (err) {
      setMemberError(err.response?.data?.message || "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  };

  const handleSplitEqually = async (expenseId) => {
    try {
      await splitAPI.splitEqually(expenseId);
      fetchAll(); // refresh so button disappears
    } catch (err) {
      alert(err.response?.data?.message || "Failed to split");
    }
  };

  const handleSettleAll = async (balance, index) => {
    try {
      const unsettled = balance.splits.filter(s => !s.settled);
      for (const split of unsettled) {
        await splitAPI.settle({ splitId: split.id });
      }
      setShowConfirm(null);
  
      // Save settled balance info to localStorage permanently
      const key = `settled_${id}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      const newEntry = {
        owesBy: balance.owesBy,
        owesByEmail: balance.owesByEmail,
        owesTo: balance.owesTo,
        owesToEmail: balance.owesToEmail,
        totalAmount: balance.totalAmount,
      };
      localStorage.setItem(key, JSON.stringify([...existing, newEntry]));
  
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to settle");
    }
  };

  const getExpenseTypeIcon = (type) => {
    if (type === "RECEIPT_UPLOAD") return "📸";
    if (type === "NATURAL_LANGUAGE") return "💬";
    return "✏️";
  };

  // Helper — get balance for current user across all balances
  const getMyBalanceSummary = () => {
    if (!balances?.balances?.length) return null;
    return balances.balances.filter(b =>
      b.owesByEmail === user?.email || b.owesToEmail === user?.email
    );
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>
  );

  const myBalances = getMyBalanceSummary();

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="text-white px-6 py-4"
        style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate("/")}
            className="flex items-center gap-2 text-white text-opacity-80 hover:text-opacity-100 mb-4 transition">
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{group?.name}</h1>
              {group?.description && (
                <p className="text-white text-opacity-80 mt-1">{group.description}</p>
              )}
            </div>
            <button onClick={() => navigate(`/group/${id}/add-expense`)}
              className="flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-xl transition font-semibold">
              <Plus size={18} />
              Add Expense
            </button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white bg-opacity-20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">{group?.totalMembers}</p>
              <p className="text-sm text-white text-opacity-80">Members</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">{expenses.length}</p>
              <p className="text-sm text-white text-opacity-80">Expenses</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">
                ₹{balances?.totalUnsettled || 0}
              </p>
              <p className="text-sm text-white text-opacity-80">Unsettled</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 flex gap-6">
          {["expenses", "balances", "members"].map((tab) => (
            <button key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 font-semibold capitalize border-b-2 transition ${
                activeTab === tab
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">

        {/* ── Expenses Tab ── */}
        {activeTab === "expenses" && (
          <div className="space-y-4">

            {/* My Balance Banner */}
            {myBalances && myBalances.length > 0 && (
              <div className="rounded-2xl p-4"
                style={{ background: "linear-gradient(135deg, #f093fb20 0%, #f5576c20 100%)", border: "1px solid #f5576c30" }}>
                <p className="text-sm font-semibold text-gray-600 mb-2">💰 Your Balance</p>
                <div className="space-y-2">
                  {myBalances.map((balance, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        {balance.owesByEmail === user?.email ? (
                          <p className="font-semibold text-gray-800">
                            You owe <span className="text-red-500">{balance.owesTo}</span>
                          </p>
                        ) : (
                          <p className="font-semibold text-gray-800">
                            <span className="text-green-500">{balance.owesBy}</span> owes you
                          </p>
                        )}
                      </div>
                      <span className={`font-bold text-lg ${
                        balance.owesByEmail === user?.email ? "text-red-500" : "text-green-500"
                      }`}>
                        ₹{balance.totalAmount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Settled Banner */}
            {(!myBalances || myBalances.length === 0) && expenses.length > 0 && (
              <div className="rounded-2xl p-4 bg-green-50 border border-green-200">
                <p className="text-green-600 font-semibold text-sm">✅ All settled up! No pending balances.</p>
              </div>
            )}

            {/* Expense List */}
            {expenses.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🧾</div>
                <h3 className="text-xl font-semibold text-gray-700">No expenses yet!</h3>
                <p className="text-gray-500 mt-2">Add your first expense to get started</p>
                <button onClick={() => navigate(`/group/${id}/add-expense`)}
                  className="mt-6 text-white px-6 py-3 rounded-2xl font-semibold"
                  style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                  Add First Expense
                </button>
              </div>
            ) : (
              expenses.map((expense) => (
                <div key={expense.id} className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                        style={{ background: "linear-gradient(135deg, #667eea20 0%, #764ba220 100%)" }}>
                        {getExpenseTypeIcon(expense.expenseType)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{expense.title}</h3>
                        <p className="text-sm text-gray-500">
                          Paid by {expense.paidByEmail === user?.email ? "You" : expense.paidBy} •{" "}
                          {new Date(expense.createdAt).toLocaleDateString()}
                        </p>
                        {expense.notes && (
                          <p className="text-sm text-gray-400 mt-1">{expense.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
  <p className="text-xl font-bold text-gray-800">₹{expense.totalAmount}</p>
  {/* Show Split Equally only if expense has no splits yet */}
  {(!expense.splitCount || expense.splitCount === 0) && (
    <button
      onClick={() => handleSplitEqually(expense.id)}
      className="text-xs text-purple-600 font-semibold mt-1 hover:underline">
      Split Equally
    </button>
  )}
</div>
                  </div>

                  {/* Items */}
                  {expense.items && expense.items.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 mb-2">ITEMS</p>
                      <div className="space-y-1">
                        {expense.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              {item.itemName} × {item.quantity}
                            </span>
                            <span className="text-gray-800 font-medium">₹{item.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Balances Tab ── */}
        {activeTab === "balances" && (
          <div className="space-y-4">

            {/* Group Spending Summary */}
            {expenses.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-semibold text-gray-600 mb-4">
                  📊 Group Spending Summary
                </p>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-600">Total Spent by Group</span>
                  <span className="font-bold text-gray-800 text-lg">
                    ₹{expenses.reduce((sum, e) => sum + e.totalAmount, 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3">
                  <span className="text-gray-600">Equal Share Per Person</span>
                  <span className="font-bold text-purple-600 text-lg">
                    ₹{(expenses.reduce((sum, e) => sum + e.totalAmount, 0) / (group?.totalMembers || 1)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Outstanding Balances */}
            {!balances?.balances?.length ? (
              <div className="text-center py-10">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-semibold text-gray-700">All settled up!</h3>
                <p className="text-gray-500 mt-2">No pending balances in this group</p>
              </div>
            ) : (
                balances.balances.map((balance, index) => (
                    <div key={index} className="bg-white rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" }}>
                            <TrendingUp size={18} className="text-white" />
                          </div>
                          <div>
                            {balance.owesByEmail === user?.email ? (
                              <p className="font-semibold text-gray-800">
                                You owe <span className="text-red-500">{balance.owesTo}</span>
                              </p>
                            ) : balance.owesToEmail === user?.email ? (
                              <p className="font-semibold text-gray-800">
                                <span className="text-green-500">{balance.owesBy}</span> owes you
                              </p>
                            ) : (
                              <p className="font-semibold text-gray-800">
                                {balance.owesBy}
                                <span className="text-gray-500 font-normal"> owes </span>
                                {balance.owesTo}
                              </p>
                            )}
                            <p className="text-sm text-gray-500 mt-1">
                              {balance.splits.length} expense{balance.splits.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                  
                        <div className="flex items-center gap-3">
                          <p className={`text-xl font-bold ${
                            balance.owesByEmail === user?.email ? "text-red-500" :
                            balance.owesToEmail === user?.email ? "text-green-500" :
                            "text-gray-800"
                          }`}>
                            ₹{balance.totalAmount}
                          </p>
                  
                          {/* Settle All — only for people involved */}
                          {(balance.owesToEmail === user?.email || balance.owesByEmail === user?.email) && (
  settledBalances.includes(index) ? (
    <span className="text-xs bg-green-100 text-green-600 px-3 py-2 rounded-xl font-semibold">
      ✅ Amount Settled
    </span>
  ) : (
    <button
      onClick={() => setShowConfirm(index)}
      className="flex items-center gap-1 bg-green-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-green-600 transition">
      <Check size={14} />
      Settle All
    </button>
  )
)}
                        </div>
                      </div>
                    </div>
                  ))
            )}
          </div>
        )}
        {/* Settled History */}
{settledHistory.length > 0 && (
  <div className="space-y-3">
    <p className="text-sm font-semibold text-gray-500 px-1">SETTLED</p>
    {settledHistory.map((entry, index) => (
      <div key={index} className="bg-white rounded-2xl p-5 shadow-sm opacity-70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-100">
              <Check size={18} className="text-green-500" />
            </div>
            <div>
              {entry.owesByEmail === user?.email ? (
                <p className="font-semibold text-gray-700">
                  You paid <span className="text-green-600">{entry.owesTo}</span>
                </p>
              ) : entry.owesToEmail === user?.email ? (
                <p className="font-semibold text-gray-700">
                  <span className="text-green-600">{entry.owesBy}</span> paid you
                </p>
              ) : (
                <p className="font-semibold text-gray-700">
                  {entry.owesBy} paid {entry.owesTo}
                </p>
              )}
              <p className="text-sm text-gray-400">Amount settled</p>
            </div>
          </div>
          <span className="font-bold text-green-500">₹{entry.totalAmount}</span>
        </div>
      </div>
    ))}
  </div>
)}

        {/* ── Members Tab ── */}
        {activeTab === "members" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-700">
                {group?.totalMembers} Members
              </h3>
              <button onClick={() => setShowAddMember(true)}
                className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                <UserPlus size={16} />
                Add Member
              </button>
            </div>

            <div className="space-y-3">
              {group?.members?.map((member) => (
                <div key={member.id}
                  className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                    style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{member.name}</p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                  {member.email === user?.email && (
                    <span className="ml-auto text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-lg font-semibold">
                      You
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Settle Confirmation Modal ── */}
      {showConfirm !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
            <div className="text-5xl mb-4">💸</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Confirm Settlement</h2>
            <p className="text-gray-500 mb-2">
              Are you sure you want to mark this as settled?
            </p>
            <p className="text-purple-600 font-bold text-xl mb-6">
              ₹{balances?.balances?.[showConfirm]?.totalAmount}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition">
                Cancel
              </button>
              <button
                onClick={() => handleSettleAll(balances.balances[showConfirm], showConfirm)}
                className="flex-1 py-3 rounded-xl text-white font-semibold transition bg-green-500 hover:bg-green-600">
                ✅ Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Add Member</h2>

            {memberError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
                {memberError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Member Email
              </label>
              <input type="email" value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="friend@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <p className="text-xs text-gray-400 mt-2">
                They must have an account on SplitSmart first
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddMember(false); setMemberError(""); }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleAddMember} disabled={addingMember}
                className="flex-1 py-3 rounded-xl text-white font-semibold transition"
                style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                {addingMember ? "Adding..." : "Add Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
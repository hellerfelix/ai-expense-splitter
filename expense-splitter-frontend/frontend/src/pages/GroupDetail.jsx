import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { groupAPI, expenseAPI, splitAPI } from "../services/api";
import { ArrowLeft, Plus, UserPlus, TrendingUp, Check,Settings } from "lucide-react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [group, setGroup] = useState(null);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ name: "", description: "" });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [showDeleteGroup, setShowDeleteGroup] = useState(false);
  const [deleteGroupLoading, setDeleteGroupLoading] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("expenses");
  const [showConfirm, setShowConfirm] = useState(null);
  const [settledHistory, setSettledHistory] = useState([]);

  const [sortBy, setSortBy] = useState("default");
  const [showFilter, setShowFilter] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", totalAmount: "", paidByEmail: "", description: "" });
  const [editLoading, setEditLoading] = useState(false);

  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState("");

  const [deleteExpenseId, setDeleteExpenseId] = useState(null);

  useEffect(() => { fetchAll(); }, [id]);

  useEffect(() => {
    const key = `settled_${id}`;
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    setSettledHistory(saved);
  }, [id]);

  useEffect(() => {
    const handleClickOutside = () => setShowFilter(false);
    if (showFilter) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showFilter]);

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
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to split");
    }
  };

  const getSortedExpenses = () => {
    const sorted = [...expenses];
    switch (sortBy) {
      case "high_to_low":
        return sorted.sort((a, b) => b.totalAmount - a.totalAmount);
      case "low_to_high":
        return sorted.sort((a, b) => a.totalAmount - b.totalAmount);
      case "mostly_paid_by": {
        const payCount = {};
        expenses.forEach(e => { payCount[e.paidBy] = (payCount[e.paidBy] || 0) + 1; });
        return sorted.sort((a, b) => payCount[b.paidBy] - payCount[a.paidBy]);
      }
      case "least_paid_by": {
        const payCount = {};
        expenses.forEach(e => { payCount[e.paidBy] = (payCount[e.paidBy] || 0) + 1; });
        return sorted.sort((a, b) => payCount[a.paidBy] - payCount[b.paidBy]);
      }
      default:
        return sorted;
    }
  };

  const openGroupSettings = () => {
    setSettingsForm({ name: group?.name || "", description: group?.description || "" });
    setShowGroupSettings(true);
  };
  
  const handleUpdateGroup = async () => {
    setSettingsLoading(true);
    try {
      await groupAPI.update(id, settingsForm);
      setShowGroupSettings(false);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update group");
    } finally {
      setSettingsLoading(false);
    }
  };
  
  const handleDeleteGroup = async () => {
    setDeleteGroupLoading(true);
    try {
      await groupAPI.delete(id);
      navigate("/");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete group");
      setDeleteGroupLoading(false);
    }
  };

  const handleEditExpense = async () => {
    setEditLoading(true);
    try {
      await expenseAPI.updateExpense(editingExpense.id, {
        title: editForm.title,
        totalAmount: parseFloat(editForm.totalAmount),
        paidByEmail: editForm.paidByEmail,
        description: editForm.description,
      });
      setShowEditModal(false);
      setEditingExpense(null);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update expense");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteExpense = async () => {
    try {
      await expenseAPI.deleteExpense(deleteExpenseId);
      setDeleteExpenseId(null);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete expense");
    }
  };

  const openEditModal = (expense) => {
    setEditingExpense(expense);
    setEditForm({
      title: expense.title,
      totalAmount: expense.totalAmount,
      paidByEmail: expense.paidByEmail,
      description: expense.notes || "",
    });
    setShowEditModal(true);
  };

  const handleSettleAll = async (balance) => {
    try {
      const unsettled = balance.splits.filter(s => !s.settled);
      for (const split of unsettled) {
        await splitAPI.settle({ splitId: split.id });
      }
      setShowConfirm(null);
      const key = `settled_${id}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      const newEntry = {
        owesBy: balance.owesBy,
        owesByEmail: balance.owesByEmail,
        owesTo: balance.owesTo,
        owesToEmail: balance.owesToEmail,
        totalAmount: balance.totalAmount,
      };
      const updated = [...existing, newEntry];
      localStorage.setItem(key, JSON.stringify(updated));
      setSettledHistory(updated);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to settle");
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const totalSpent = expenses.reduce((sum, e) => sum + e.totalAmount, 0);

    // Header gradient bar
    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, 220, 35, "F");

    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("SplitSmart", 14, 15);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Group: ${group?.name}`, 14, 25);

    // Sub info
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`Exported on: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, 14, 44);
    if (group?.description) {
      doc.text(`Description: ${group.description}`, 14, 50);
    }

    // Summary cards
    const cardY = 58;
    const individualSpent = group?.totalMembers
  ? Math.round((totalSpent / group.totalMembers) * 100) / 100
  : 0;

const cards = [
  { label: "Total Spent", value: `Rs.${totalSpent}`, color: [102, 126, 234] },
  { label: "Individual Share", value: `Rs.${individualSpent}`, color: [118, 75, 162] },
  { label: "Members", value: `${group?.totalMembers}`, color: [67, 233, 123] },
  { label: "Unsettled", value: `Rs.${balances?.totalUnsettled || 0}`, color: [245, 87, 108] },
];
    cards.forEach((card, i) => {
      const x = 14 + i * 47;
      doc.setFillColor(...card.color);
      doc.roundedRect(x, cardY, 43, 20, 3, 3, "F");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "normal");
      doc.text(card.label, x + 4, cardY + 7);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(card.value, x + 4, cardY + 15);
    });

    // Expenses Table
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "bold");
    doc.text("Expenses", 14, cardY + 32);

    autoTable(doc, {
      startY: cardY + 36,
      head: [["#", "Title", "Amount (Rs.)", "Paid By", "Type", "Date"]],
      body: expenses.map((e, i) => [
        i + 1,
        e.title,
        `Rs.${e.totalAmount}`,
        e.paidByEmail === user?.email ? "You" : e.paidBy,
        e.expenseType === "RECEIPT_UPLOAD" ? "Receipt" :
          e.expenseType === "NATURAL_LANGUAGE" ? "AI" : "Manual",
        new Date(e.createdAt).toLocaleDateString("en-IN"),
      ]),
      headStyles: {
        fillColor: [102, 126, 234],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
      alternateRowStyles: { fillColor: [245, 245, 255] },
      columnStyles: {
        0: { cellWidth: 10 },
        2: { halign: "right" },
      },
    });

    // Balances Table
    if (balances?.balances?.length > 0) {
      const finalY = doc.lastAutoTable.finalY + 12;
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("Outstanding Balances", 14, finalY);

      autoTable(doc, {
        startY: finalY + 4,
        head: [["Who Owes", "To Whom", "Amount (Rs.)"]],
        body: balances.balances.map((b) => [
          b.owesByEmail === user?.email ? "You" : b.owesBy,
          b.owesToEmail === user?.email ? "You" : b.owesTo,
          `Rs.${b.totalAmount}`,
        ]),
        headStyles: {
          fillColor: [245, 87, 108],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
        alternateRowStyles: { fillColor: [255, 245, 245] },
        columnStyles: { 2: { halign: "right" } },
      });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      doc.setFont("helvetica", "normal");
      doc.text(
        `SplitSmart  |  ${group?.name}  |  Page ${i} of ${pageCount}`,
        14,
        doc.internal.pageSize.height - 8
      );
    }

    doc.save(`${group?.name}-expenses.pdf`);
  };

  const getExpenseTypeIcon = (type) => {
    if (type === "RECEIPT_UPLOAD") return "📸";
    if (type === "NATURAL_LANGUAGE") return "💬";
    return "✏️";
  };

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
            <div className="flex items-center gap-3">
  <button
    onClick={handleExportPDF}
    className="flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-xl transition font-semibold">
    📄 Export PDF
  </button>
  <button onClick={() => navigate(`/group/${id}/add-expense`)}
    className="flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-xl transition font-semibold">
    <Plus size={18} />
    Add Expense
  </button>
  <button onClick={openGroupSettings}
    className="w-10 h-10 flex items-center justify-center bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl transition">
    <Settings size={18} />
  </button>
</div>
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
              <p className="text-2xl font-bold">₹{balances?.totalUnsettled || 0}</p>
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

            {/* Filter Bar */}
            {expenses.length > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{expenses.length} expenses</p>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setShowFilter(!showFilter)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                      sortBy !== "default"
                        ? "border-purple-500 text-purple-600 bg-purple-50"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}>
                    ⚙️ Filter
                    {sortBy !== "default" && (
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    )}
                  </button>

                  {showFilter && (
                    <div className="absolute right-0 top-12 bg-white rounded-2xl shadow-xl border border-gray-100 z-20 w-56 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-400 px-4 pt-3 pb-1">SORT BY</p>
                      {[
                        { key: "default", label: "🕐 Default (Recent)" },
                        { key: "high_to_low", label: "💰 Amount High to Low" },
                        { key: "low_to_high", label: "💸 Amount Low to High" },
                        { key: "mostly_paid_by", label: "👑 Mostly Paid By" },
                        { key: "least_paid_by", label: "🙈 Least Paid By" },
                      ].map((option) => (
                        <button
                          key={option.key}
                          onClick={() => { setSortBy(option.key); setShowFilter(false); }}
                          className={`w-full text-left px-4 py-3 text-sm transition hover:bg-gray-50 ${
                            sortBy === option.key
                              ? "text-purple-600 font-semibold bg-purple-50"
                              : "text-gray-700"
                          }`}>
                          {option.label}
                        </button>
                      ))}
                      {sortBy !== "default" && (
                        <button
                          onClick={() => { setSortBy("default"); setShowFilter(false); }}
                          className="w-full text-left px-4 py-3 text-sm text-red-500 font-semibold hover:bg-red-50 border-t border-gray-100 transition">
                          ✕ Clear Filter
                        </button>
                      )}
                    </div>
                  )}
                </div>
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
              getSortedExpenses().map((expense) => (
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
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(expense); }}
                        className="text-xs text-blue-500 font-semibold mt-1 hover:underline">
                        Edit
                      </button>
                      {(!expense.splitCount || expense.splitCount === 0) && (
                        <button
                          onClick={() => handleSplitEqually(expense.id)}
                          className="text-xs text-purple-600 font-semibold mt-1 hover:underline ml-2">
                          Split Equally
                        </button>
                      )}
                    </div>
                  </div>

                  {expense.items && expense.items.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 mb-2">ITEMS</p>
                      <div className="space-y-1">
                        {expense.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-gray-600">{item.itemName} × {item.quantity}</span>
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
            {expenses.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-semibold text-gray-600 mb-4">📊 Group Spending Summary</p>
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
                            {balance.owesBy}<span className="text-gray-500 font-normal"> owes </span>{balance.owesTo}
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
                        balance.owesToEmail === user?.email ? "text-green-500" : "text-gray-800"
                      }`}>
                        ₹{balance.totalAmount}
                      </p>
                      {balance.owesToEmail === user?.email && (
                        <button onClick={() => setShowConfirm(index)}
                          className="flex items-center gap-1 bg-green-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-green-600 transition">
                          <Check size={14} />
                          Settle All
                        </button>
                      )}
                      {balance.owesByEmail === user?.email && (
                        <span className="text-xs bg-red-100 text-red-500 px-3 py-1 rounded-xl font-semibold">
                          You owe this
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

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
                            <p className="font-semibold text-gray-700">You paid <span className="text-green-600">{entry.owesTo}</span></p>
                          ) : entry.owesToEmail === user?.email ? (
                            <p className="font-semibold text-gray-700"><span className="text-green-600">{entry.owesBy}</span> paid you</p>
                          ) : (
                            <p className="font-semibold text-gray-700">{entry.owesBy} paid {entry.owesTo}</p>
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
          </div>
        )}

        {/* ── Members Tab ── */}
        {activeTab === "members" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-700">{group?.totalMembers} Members</h3>
              <button onClick={() => setShowAddMember(true)}
                className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                <UserPlus size={16} />
                Add Member
              </button>
            </div>
            <div className="space-y-3">
              {group?.members?.map((member) => (
                <div key={member.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                    style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{member.name}</p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                  {member.email === user?.email && (
                    <span className="ml-auto text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-lg font-semibold">You</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Settle Confirmation Modal */}
      {showConfirm !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
            <div className="text-5xl mb-4">💸</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Confirm Settlement</h2>
            <p className="text-gray-500 mb-2">Are you sure you want to mark this as settled?</p>
            <p className="text-purple-600 font-bold text-xl mb-6">
              ₹{balances?.balances?.[showConfirm]?.totalAmount}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={() => handleSettleAll(balances.balances[showConfirm])}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Member Email</label>
              <input type="email" value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="friend@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <p className="text-xs text-gray-400 mt-2">They must have an account on SplitSmart first</p>
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

      {/* Edit Expense Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Edit Expense</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input type="number" value={editForm.totalAmount}
                  onChange={(e) => setEditForm({ ...editForm, totalAmount: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paid By</label>
                <select value={editForm.paidByEmail}
                  onChange={(e) => setEditForm({ ...editForm, paidByEmail: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400">
                  {group?.members?.map((member) => (
                    <option key={member.id} value={member.email}>
                      {member.name} {member.email === user?.email ? "(You)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowEditModal(false); setEditingExpense(null); }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition">
                Cancel
              </button>
              <button
                onClick={() => { setDeleteExpenseId(editingExpense.id); setShowEditModal(false); setEditingExpense(null); }}
                className="flex-1 py-3 rounded-xl text-white font-semibold transition bg-red-500 hover:bg-red-600">
                🗑️ Delete
              </button>
              <button onClick={handleEditExpense} disabled={editLoading}
                className="flex-1 py-3 rounded-xl text-white font-semibold transition"
                style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Expense Confirmation Modal */}
      {deleteExpenseId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
            <div className="text-5xl mb-4">🗑️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Delete Expense</h2>
            <p className="text-gray-500 mb-6">Are you sure you want to delete this expense? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteExpenseId(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleDeleteExpense}
                className="flex-1 py-3 rounded-xl text-white font-semibold transition bg-red-500 hover:bg-red-600">
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Group Settings Modal */}
{showGroupSettings && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">⚙️ Group Settings</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
          <input type="text"
            value={settingsForm.name}
            onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input type="text"
            value={settingsForm.description}
            onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={() => setShowGroupSettings(false)}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition">
          Cancel
        </button>
        <button onClick={handleUpdateGroup} disabled={settingsLoading}
          className="flex-1 py-3 rounded-xl text-white font-semibold transition"
          style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
          {settingsLoading ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-400 mb-3">DANGER ZONE</p>
        <button
          onClick={() => { setShowGroupSettings(false); setShowDeleteGroup(true); }}
          className="w-full py-3 rounded-xl border border-red-300 text-red-500 font-semibold hover:bg-red-50 transition">
          🗑️ Delete Group
        </button>
      </div>
    </div>
  </div>
)}

{/* Delete Group Confirmation Modal */}
{showDeleteGroup && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
    <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Delete Group</h2>
      <p className="text-gray-500 mb-2">
        Are you sure you want to delete <span className="font-bold text-gray-800">{group?.name}</span>?
      </p>
      <p className="text-red-500 text-sm mb-6">
        This will permanently delete all expenses and splits. This cannot be undone.
      </p>
      <div className="flex gap-3">
        <button onClick={() => setShowDeleteGroup(false)}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition">
          Cancel
        </button>
        <button onClick={handleDeleteGroup} disabled={deleteGroupLoading}
          className="flex-1 py-3 rounded-xl text-white font-semibold transition bg-red-500 hover:bg-red-600">
          {deleteGroupLoading ? "Deleting..." : "🗑️ Delete"}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
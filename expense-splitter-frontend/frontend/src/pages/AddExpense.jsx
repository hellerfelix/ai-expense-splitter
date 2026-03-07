import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { groupAPI, expenseAPI, splitAPI } from "../services/api";
import { ArrowLeft, ChevronDown } from "lucide-react";

export default function AddExpense() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("manual");
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(false);

  // Split state
  const [paidByEmail, setPaidByEmail] = useState("");
  const [splitMembers, setSplitMembers] = useState([]); // empty = all members
  const [showSplitDropdown, setShowSplitDropdown] = useState(false);

  // Manual form
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [description, setDescription] = useState("");
  

  // Natural language
  const [naturalText, setNaturalText] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    groupAPI.getById(id).then((res) => {
      setGroup(res.data);
    });
    const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
    setPaidByEmail(savedUser.email || "");
  }, [id]);

  // Close split dropdown on outside click
  useEffect(() => {
    const handleClickOutside = () => setShowSplitDropdown(false);
    if (showSplitDropdown) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showSplitDropdown]);

  const toggleSplitMember = (email) => {
    setSplitMembers(prev =>
      prev.includes(email)
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const getSplitLabel = () => {
    if (splitMembers.length === 0) return "Equally (All)";
    if (splitMembers.length === 1) {
      const m = group?.members?.find(m => m.email === splitMembers[0]);
      return m ? (m.email === user?.email ? "You" : m.name) : "1 member";
    }
    return `${splitMembers.length} members`;
  };

  const getSplitMembersToUse = () => {
    if (splitMembers.length === 0) return group?.members?.map(m => m.email) || [];
    return splitMembers;
  };

  // ── Manual Submit ──
  const handleManualSubmit = async () => {
    if (!title || !totalAmount) {
      alert("Please enter title and amount");
      return;
    }
    setLoading(true);
    try {
        const expenseRes = await expenseAPI.createManual({
            title,
            totalAmount: parseFloat(totalAmount),
            groupId: id,
            paidByEmail,
            description,
          });

      const membersToSplit = getSplitMembersToUse();
      const allMembers = group?.members?.map(m => m.email) || [];
      const isAllMembers = membersToSplit.length === allMembers.length;

      if (isAllMembers) {
        await splitAPI.splitEqually(expenseRes.data.id);
      } else {
        await splitAPI.splitCustom(expenseRes.data.id, { memberEmails: membersToSplit });
      }

      navigate(`/group/${id}`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create expense");
    } finally {
      setLoading(false);
    }
  };

  // ── Natural Language Submit ──
  const handleNaturalSubmit = async () => {
    if (!naturalText.trim()) return;
    setAiLoading(true);
    try {
      const res = await expenseAPI.createNatural({ text: naturalText, groupId: id });
      setAiResult(res.data);
    } catch (err) {
      alert(err.response?.data?.message || "AI processing failed");
    } finally {
      setAiLoading(false);
    }
  };

  // ── Save AI Result ──
  const handleSaveAiResult = async () => {
    if (!aiResult) return;
    setLoading(true);
    try {
      const expenseRes = await expenseAPI.saveAiExpense({
        title: aiResult.title,
        totalAmount: aiResult.totalAmount,
        groupId: id,
        paidByEmail,
        items: aiResult.items.map(i => ({
          itemName: i.itemName,
          price: i.price,
          quantity: i.quantity || 1,
        }))
      }, "NATURAL_LANGUAGE");

      await splitAPI.splitEqually(expenseRes.data.id);
      navigate(`/group/${id}`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save expense");
    } finally {
      setLoading(false);
    }
  };


  
  

  // ── Paid By + Split Row ──
  const PaidBySplitRow = () => (
    <div className="rounded-2xl border-2 border-purple-100 bg-purple-50 p-4">
      <div className="flex items-center gap-2 flex-wrap">

        {/* Paid By */}
        <span className="text-sm font-semibold text-gray-700">Paid by</span>
        <select
          value={paidByEmail}
          onChange={(e) => setPaidByEmail(e.target.value)}
          className="px-3 py-2 rounded-xl border border-purple-200 bg-white text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer">
          {group?.members?.map((member) => (
            <option key={member.id} value={member.email}>
              {member.email === user?.email ? "You" : member.name}
            </option>
          ))}
        </select>

        <span className="text-sm font-semibold text-gray-700">and split</span>

        {/* Split Among */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setShowSplitDropdown(!showSplitDropdown)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-purple-200 bg-white text-sm font-semibold text-gray-800 hover:border-purple-400 transition">
            {getSplitLabel()}
            <ChevronDown size={14} className={`transition-transform ${showSplitDropdown ? "rotate-180" : ""}`} />
          </button>

          {showSplitDropdown && (
            <div className="absolute top-12 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 z-30 w-52 overflow-hidden">
              <p className="text-xs font-semibold text-gray-400 px-4 pt-3 pb-1">SPLIT AMONG</p>

              {/* Select All option */}
              <button
                onClick={() => setSplitMembers([])}
                className={`w-full text-left px-4 py-3 text-sm transition hover:bg-gray-50 flex items-center justify-between ${
                  splitMembers.length === 0 ? "text-purple-600 font-semibold bg-purple-50" : "text-gray-700"
                }`}>
                <span> All Members</span>
                {splitMembers.length === 0 && <span className="text-purple-500">✓</span>}
              </button>

              <div className="border-t border-gray-100">
                {group?.members?.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => toggleSplitMember(member.email)}
                    className={`w-full text-left px-4 py-3 text-sm transition hover:bg-gray-50 flex items-center justify-between ${
                      splitMembers.includes(member.email)
                        ? "text-purple-600 font-semibold bg-purple-50"
                        : "text-gray-700"
                    }`}>
                    <span>
                      {member.email === user?.email ? `${member.name} (You)` : member.name}
                    </span>
                    {splitMembers.includes(member.email) && (
                      <span className="text-purple-500">✓</span>
                    )}
                  </button>
                ))}
              </div>

              {splitMembers.length > 0 && (
                <div className="border-t border-gray-100 px-4 py-2">
                  <p className="text-xs text-gray-400">
                    Rs.{totalAmount
                      ? (parseFloat(totalAmount) / splitMembers.length).toFixed(2)
                      : "0"} per person
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary line */}
      <p className="text-xs text-purple-500 mt-2 font-medium">
        {splitMembers.length === 0
          ? `Split equally among all ${group?.members?.length || 0} members`
          : `Split among ${splitMembers.length} selected member${splitMembers.length !== 1 ? "s" : ""} — Rs.${
              totalAmount
                ? (parseFloat(totalAmount) / splitMembers.length).toFixed(2)
                : "0"
            } each`
        }
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="text-white px-6 py-4"
        style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate(`/group/${id}`)}
            className="flex items-center gap-2 text-white text-opacity-80 hover:text-opacity-100 mb-4 transition">
            <ArrowLeft size={20} />
            Back to {group?.name}
          </button>
          <h1 className="text-2xl font-bold">Add Expense</h1>
          <p className="text-white text-opacity-80 mt-1">
            Choose how you want to add the expense
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-6 flex gap-6">
          {[
            { key: "manual", label: "✏️ Manual" },
            { key: "natural", label: "💬 Natural Language" },
            { key: "receipt", label: "📸 Receipt Upload" },
          ].map((tab) => (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-4 font-semibold border-b-2 transition ${
                activeTab === tab.key
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6">

        {/* ── Manual Tab ── */}
        {activeTab === "manual" && (
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input type="text" value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Dinner at Pizza Hut"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₹) *</label>
              <input type="number" value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input type="text" value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            

            {/* Paid By + Split Row */}
            <PaidBySplitRow />

            <button onClick={handleManualSubmit} disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-lg transition"
              style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
              {loading ? "Saving..." : "Add Expense"}
            </button>
          </div>
        )}

        {/* ── Natural Language Tab ── */}
        {activeTab === "natural" && (
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
            <div className="bg-purple-50 rounded-xl p-4">
              <p className="text-purple-700 text-sm font-medium">💡 How it works</p>
              <p className="text-purple-600 text-sm mt-1">
                Just type naturally! e.g. "Rahul and I had dinner, I paid ₹800.
                Rahul had pasta for ₹350 and I had pizza for ₹450"
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Describe the expense</label>
              <textarea value={naturalText}
                onChange={(e) => setNaturalText(e.target.value)}
                placeholder="Type your expense naturally..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paid By</label>
              <select value={paidByEmail}
                onChange={(e) => setPaidByEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400">
                {group?.members?.map((member) => (
                  <option key={member.id} value={member.email}>
                    {member.name} {member.email === user?.email ? "(You)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* AI Result Preview */}
            {aiResult && (
              <div className="border-2 border-purple-200 rounded-xl p-4 bg-purple-50">
                <p className="font-semibold text-purple-700 mb-3">✨ AI Extracted Result</p>
                <p className="font-bold text-gray-800">{aiResult.title}</p>
                <p className="text-gray-600 text-sm">Total: ₹{aiResult.totalAmount}</p>
                {aiResult.items?.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {aiResult.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm text-gray-600">
                        <span>{item.itemName} × {item.quantity}</span>
                        <span>₹{item.price}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={handleSaveAiResult} disabled={loading}
                  className="w-full mt-4 py-2 rounded-xl text-white font-semibold"
                  style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                  {loading ? "Saving..." : "Save This Expense"}
                </button>
              </div>
            )}

            {!aiResult && (
              <button onClick={handleNaturalSubmit} disabled={aiLoading}
                className="w-full py-3 rounded-xl text-white font-semibold text-lg transition"
                style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                {aiLoading ? "AI Processing..." : "✨ Extract with AI"}
              </button>
            )}
          </div>
        )}

        {/* ── Receipt Upload Tab ── */}
        {activeTab === "receipt" && (
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <div className="text-6xl mb-4">📸</div>
            <h3 className="text-xl font-semibold text-gray-700">Receipt Upload</h3>
            <p className="text-gray-500 mt-2">This feature requires an OpenAI API key.</p>
            <p className="text-gray-400 text-sm mt-1">
              Add your API key in application.properties to enable this feature.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
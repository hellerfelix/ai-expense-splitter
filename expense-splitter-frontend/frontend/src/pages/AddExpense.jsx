import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { groupAPI, expenseAPI, splitAPI } from "../services/api";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

export default function AddExpense() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("manual");
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [splitMethod, setSplitMethod] = useState("equal");

  // Manual form
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paidByEmail, setPaidByEmail] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState([{ itemName: "", price: "", quantity: 1 }]);

  // Natural language
  const [naturalText, setNaturalText] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    groupAPI.getById(id).then((res) => setGroup(res.data));
    const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
    setPaidByEmail(savedUser.email || "");
  }, [id]);

  // ── Manual Submit ──
  const handleManualSubmit = async () => {
    if (!title || !totalAmount) {
      alert("Please enter title and amount");
      return;
    }
    setLoading(true);
    try {
      const validItems = items.filter(i => i.itemName && i.price);
      const expenseRes = await expenseAPI.createManual({
        title,
        totalAmount: parseFloat(totalAmount),
        groupId: id,
        paidByEmail,
        description,
        items: validItems.map(i => ({
          itemName: i.itemName,
          price: parseFloat(i.price),
          quantity: parseInt(i.quantity) || 1,
        }))
      });

      // Auto split equally if selected
      if (splitMethod === "equal") {
        await splitAPI.splitEqually(expenseRes.data.id);
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
      const res = await expenseAPI.createNatural({
        text: naturalText,
        groupId: id,
      });
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

      if (splitMethod === "equal") {
        await splitAPI.splitEqually(expenseRes.data.id);
      }

      navigate(`/group/${id}`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save expense");
    } finally {
      setLoading(false);
    }
  };

  // ── Item helpers ──
  const addItem = () => setItems([...items, { itemName: "", price: "", quantity: 1 }]);
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  // ── Split Method Selector ──
  const SplitMethodSelector = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Split Method
      </label>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setSplitMethod("equal")}
          className={`p-4 rounded-xl border-2 text-left transition ${
            splitMethod === "equal"
              ? "border-purple-500 bg-purple-50"
              : "border-gray-200 hover:border-gray-300"
          }`}>
          <p className="font-semibold text-gray-800">⚖️ Split Equally</p>
          <p className="text-xs text-gray-500 mt-1">
            Divide equally among all members
          </p>
        </button>
        <button
          type="button"
          onClick={() => setSplitMethod("none")}
          className={`p-4 rounded-xl border-2 text-left transition ${
            splitMethod === "none"
              ? "border-purple-500 bg-purple-50"
              : "border-gray-200 hover:border-gray-300"
          }`}>
          <p className="font-semibold text-gray-800">⏭️ Split Later</p>
          <p className="text-xs text-gray-500 mt-1">
            Add expense without splitting now
          </p>
        </button>
      </div>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input type="text" value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Dinner at Pizza Hut"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Amount (₹) *
              </label>
              <input type="number" value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Paid By
              </label>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input type="text" value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Items (Optional)
                </label>
                <button onClick={addItem}
                  className="flex items-center gap-1 text-purple-600 text-sm font-semibold hover:underline">
                  <Plus size={14} /> Add Item
                </button>
              </div>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input type="text"
                      value={item.itemName}
                      onChange={(e) => updateItem(index, "itemName", e.target.value)}
                      placeholder="Item name"
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                    />
                    <input type="number"
                      value={item.price}
                      onChange={(e) => updateItem(index, "price", e.target.value)}
                      placeholder="Price"
                      className="w-24 px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                    />
                    <input type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      placeholder="Qty"
                      className="w-16 px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                    />
                    {items.length > 1 && (
                      <button onClick={() => removeItem(index)}
                        className="text-red-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Split Method */}
            <SplitMethodSelector />

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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Describe the expense
              </label>
              <textarea value={naturalText}
                onChange={(e) => setNaturalText(e.target.value)}
                placeholder="Type your expense naturally..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Paid By
              </label>
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

            {/* Split Method */}
            <SplitMethodSelector />

            {/* AI Result Preview */}
            {aiResult && (
              <div className="border-2 border-purple-200 rounded-xl p-4 bg-purple-50">
                <p className="font-semibold text-purple-700 mb-3">
                  ✨ AI Extracted Result
                </p>
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
            <p className="text-gray-500 mt-2">
              This feature requires an OpenAI API key.
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Add your API key in application.properties to enable this feature.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
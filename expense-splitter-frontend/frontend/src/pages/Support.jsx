import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import emailjs from "@emailjs/browser";

// 🔑 Paste your keys here
const EMAILJS_SERVICE_ID = "service_4xc4lkf";
const EMAILJS_TEMPLATE_ID = "template_dtezb5a";
const EMAILJS_PUBLIC_KEY = "713OF2apLYu4f0sx0";

export default function Support() {
  const navigate = useNavigate();

  const [type, setType] = useState("bug");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const typeOptions = [
    { key: "contact", label: "💬 Contact Us", desc: "General questions or feedback" },
    { key: "feature", label: "✨ Feature Request", desc: "Suggest a new feature or improvement" },
    { key: "bug", label: "🐛 Bug Report", desc: "Something is broken or not working" },
  ];

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          type: typeOptions.find(t => t.key === type)?.label || type,
          from_name: name,
          from_email: email,
          message: message,
        },
        EMAILJS_PUBLIC_KEY
      );
      setSubmitted(true);
    } catch (err) {
      console.error("EmailJS error:", err);
      alert("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="text-white px-6 py-4"
        style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate("/")}
  className="flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-xl transition font-semibold text-sm self-start">
  <ArrowLeft size={16} />
  Back to Dashboard
</button>
          <div className="flex flex-col items-center pb-6 text-center">
            <div className="text-5xl mb-3"></div>
            <h1 className="text-2xl font-bold">Support Center</h1>
            <p className="text-white text-opacity-70 mt-1">
              We're here to help. Reach out anytime!
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-5">

        {submitted ? (
          <div className="bg-white rounded-3xl p-10 shadow-sm text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Message Sent!</h2>
            <p className="text-gray-500 mb-6">
              Thanks for reaching out. We'll get back to you soon.
            </p>
            <button
              onClick={() => { setSubmitted(false); setName(""); setEmail(""); setMessage(""); }}
              className="px-6 py-3 rounded-xl text-white font-semibold"
              style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
              Send Another
            </button>
          </div>
        ) : (
          <>
            {/* Type Selector */}
            <div className="grid grid-cols-3 gap-3">
              {typeOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setType(option.key)}
                  className={`p-4 rounded-2xl border-2 text-left transition ${
                    type === option.key
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}>
                  <p className="font-semibold text-gray-800 text-sm">{option.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{option.desc}</p>
                </button>
              ))}
            </div>

            {/* Form */}
            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <input type="text" value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Please enter your full name"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Your Email</label>
  <input type="email" value={email}
    onChange={(e) => setEmail(e.target.value)}
    placeholder="you@example.com"
    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-400 ${
      email && !email.trim().endsWith(".com")
        ? "border-red-400 bg-red-50"
        : "border-gray-200"
    }`}
  />
  {email && !email.trim().endsWith(".com") && (
    <p className="text-red-500 text-xs mt-1 font-medium">
      Please enter a valid email address
    </p>
  )}
</div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {type === "bug" ? "Describe the bug" :
                   type === "feature" ? "Describe your idea" :
                   "Your message"}
                </label>
                <textarea value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    type === "bug" ? "What happened? What did you expect?" :
                    type === "feature" ? "What feature would you like to see?" :
                    "How can we help you?"
                  }
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                />
              </div>

              <button onClick={handleSubmit} disabled={loading}
                className="w-full py-3 rounded-xl text-white font-semibold transition"
                style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                {loading ? "Sending..." : "📨 Send Message"}
              </button>
            </div>

            {/* Info card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-600 mb-3">📋 Before you write</p>
              <div className="space-y-2 text-sm text-gray-500">
              <p>💬 <span className="font-medium text-gray-700">Question?</span> We usually reply within 24h</p>
              <p>✨ <span className="font-medium text-gray-700">Feature?</span> Describe the problem it solves</p>
              <p>🐛 <span className="font-medium text-gray-700">Bug?</span> Include steps to reproduce it</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
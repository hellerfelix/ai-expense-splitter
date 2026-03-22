import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { groupAPI } from "../services/api";

export default function JoinGroup() {
  const { token } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("joining"); // joining | success | error
  const [message, setMessage] = useState("");
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    if (loading) return; // wait for auth to finish
    if (!user) {
      navigate(`/login?redirect=/join/${token}`);
      return;
    }
    if (hasJoined) return; // prevent duplicate calls
    setHasJoined(true);
    handleJoin();
  }, [user, loading]);

  const handleJoin = async () => {
    try {
      // small delay to ensure auth token is ready in localStorage
      await new Promise(resolve => setTimeout(resolve, 300));
      await groupAPI.joinByInviteLink(token);
      setStatus("success");
      // auto redirect to dashboard after 2 seconds
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      setStatus("error");
      setMessage(err.response?.data?.message || "Invalid or expired invite link");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl p-10 w-full max-w-sm shadow-2xl text-center">

        {status === "joining" && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-gray-800">Joining group...</h2>
            <p className="text-gray-400 text-sm mt-2">Please wait a moment</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">You're in!</h2>
            <p className="text-gray-500 mb-2">You have successfully joined the group.</p>
            <p className="text-gray-400 text-sm mb-6">Redirecting to dashboard in 2 seconds...</p>
            <button
              onClick={() => navigate("/")}
              className="w-full py-3 rounded-xl text-white font-semibold"
              style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
              Go to Dashboard Now
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Oops!</h2>
            <p className="text-gray-500 mb-6">{message}</p>
            <button
              onClick={() => navigate("/")}
              className="w-full py-3 rounded-xl text-white font-semibold"
              style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
              Go to Dashboard
            </button>
          </>
        )}

      </div>
    </div>
  );
}
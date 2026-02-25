import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

type UserNavbarProps = {
  variant?: "overlay" | "solid";
};

type UserProfile = {
  id: number;
  name: string;
  email: string;
  number: string;
};

const UserNavbar = ({ variant = "solid" }: UserNavbarProps) => {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");
  const rawUsername = localStorage.getItem("username");
  const rawEmail = localStorage.getItem("userEmail");
  const rawNumber = localStorage.getItem("userNumber");

  const username =
    rawUsername &&
    rawUsername.trim() !== "" &&
    rawUsername !== "undefined" &&
    rawUsername !== "null"
      ? rawUsername
      : null;

  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>({
    id: Number(userId || 0),
    name: username || "",
    email: rawEmail || "",
    number: rawNumber || "",
  });
  const [loadingProfile, setLoadingProfile] = useState(false);

  const fetchProfile = async () => {
    if (!userId) {
      return;
    }

    try {
      setLoadingProfile(true);
      const res = await fetch(`http://localhost:8080/api/users/${userId}/profile`);
      if (!res.ok) {
        throw new Error("Failed to load profile");
      }

      const data = await res.json();
      setProfile(data);
      localStorage.setItem("username", data.name || "");
      localStorage.setItem("userEmail", data.email || "");
      localStorage.setItem("userNumber", data.number || "");
    } catch (error) {
      // Keep local fallback data visible even when API call fails.
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (!showProfile) {
      return;
    }
    fetchProfile();
  }, [showProfile]);

  if (role !== "CUSTOMER") {
    return null;
  }

  const textClass = variant === "overlay" ? "text-white" : "text-gray-700";
  const hoverClass = variant === "overlay" ? "hover:text-indigo-300" : "hover:text-indigo-600";
  const barClass =
    variant === "overlay"
      ? "bg-transparent"
      : "bg-white/95 backdrop-blur-sm border-b border-gray-200";

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${barClass}`}>
      <div className={`max-w-7xl mx-auto px-6 py-4 flex items-center justify-end gap-6 text-sm font-medium ${textClass}`}>
        <Link to="/home" className={`${hoverClass} transition`}>
          Home
        </Link>
        <Link to="/dashboard" className={`${hoverClass} transition`}>
          Dashboard
        </Link>
        <Link to="/purchaseproduct" className={`${hoverClass} transition`}>
          Purchase Product
        </Link>
        {username && <span className="text-indigo-300">Welcome, {username}</span>}
        <button
          type="button"
          onClick={() => setShowProfile((prev) => !prev)}
          className={`${hoverClass} transition text-lg`}
          title="Profile"
        >
          &#128100;
        </button>
        <button
          onClick={() => {
            localStorage.clear();
            navigate("/login");
          }}
          className="text-red-500 hover:text-red-400 transition"
        >
          Logout
        </button>
      </div>

      {showProfile && (
        <div className="absolute right-6 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 p-5 text-gray-700">
          <h3 className="text-base font-semibold mb-4">Profile</h3>

          {loadingProfile && (
            <p className="text-sm text-gray-500 mb-3">Loading latest profile...</p>
          )}
          <>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Full Name</label>
                <input
                  type="text"
                  value={profile?.name || ""}
                  readOnly
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100"
                />
              </div>

              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Email ID</label>
                <input
                  type="text"
                  value={profile?.email || ""}
                  readOnly
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100"
                />
              </div>

              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Number</label>
                <input
                  type="text"
                  value={profile?.number || ""}
                  readOnly
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProfile(false)}
                  className="px-4 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300 transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfile(false);
                    navigate("/customize-profile");
                  }}
                  className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-500 transition disabled:opacity-60"
                >
                  Update Profile
                </button>
              </div>
            </>
        </div>
      )}
    </div>
  );
};

export default UserNavbar;

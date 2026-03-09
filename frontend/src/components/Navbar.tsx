import { useCallback, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { normalizeRole } from "../utils/auth";

type UserProfile = {
  id: number;
  name: string;
  email: string;
  number: string;
};

const Navbar = () => {
  const navigate = useNavigate();
  const role = normalizeRole(localStorage.getItem("role"));
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
  const [displayName, setDisplayName] = useState(username || "");
  const [profile, setProfile] = useState<UserProfile | null>({
    id: Number(userId || 0),
    name: displayName,
    email: rawEmail || "",
    number: rawNumber || "",
  });
  const [loadingProfile, setLoadingProfile] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      setLoadingProfile(true);
      let res = await fetch(`http://localhost:8080/api/users/${userId}/profile`);
      if (!res.ok) {
        res = await fetch(`http://localhost:8080/api/users/${userId}`);
      }
      if (!res.ok) {
        throw new Error("Failed to load profile");
      }

      const data = await res.json();
      setProfile(data);
      localStorage.setItem("username", data.name || "");
      localStorage.setItem("userEmail", data.email || "");
      localStorage.setItem("userNumber", data.number || "");
      setDisplayName(data.name || "");
    } catch {
      // Keep local fallback profile when API fails.
    } finally {
      setLoadingProfile(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!showProfile) {
      return;
    }
    void fetchProfile();
  }, [showProfile, fetchProfile]);

  useEffect(() => {
    const syncFromStorage = () => {
      const nextName = localStorage.getItem("username") || "";
      const nextEmail = localStorage.getItem("userEmail") || "";
      const nextNumber = localStorage.getItem("userNumber") || "";

      setDisplayName(nextName);
      setProfile((prev) => ({
        id: prev?.id || Number(userId || 0),
        name: nextName,
        email: nextEmail,
        number: nextNumber,
      }));
    };

    window.addEventListener("profile-updated", syncFromStorage);
    window.addEventListener("storage", syncFromStorage);
    return () => {
      window.removeEventListener("profile-updated", syncFromStorage);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, [userId]);

  if (role !== "CUSTOMER") {
    return null;
  }

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "text-indigo-600 font-semibold border-b-2 border-indigo-600 pb-1"
      : "hover:text-indigo-600 transition";

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-sm font-medium text-gray-700">
        <NavLink to="/home" className="text-2xl font-bold text-indigo-500 hover:text-indigo-400 transition">
          RMC ERP
        </NavLink>
        <div className="flex items-center gap-6">
          <NavLink to="/home" className={navItemClass}>
            Home
          </NavLink>
          <NavLink to="/dashboard" className={navItemClass}>
            My Orders
          </NavLink>
          <NavLink to="/purchaseproduct" className={navItemClass}>
            Purchase Product
          </NavLink>
          <NavLink to="/delivery-tracking" className={navItemClass}>
            Delivery Tracking
          </NavLink>
          <NavLink to="/billing-payment" className={navItemClass}>
            Billing & Payment
          </NavLink>
          <NavLink to="/quality-access" className={navItemClass}>
            Quality Access
          </NavLink>
          <NavLink to="/about-us" className={navItemClass}>
            About Us
          </NavLink>
          <NavLink to="/contact-us" className={navItemClass}>
            Contact Us
          </NavLink>
          {displayName && <span className="text-indigo-600">Welcome, {displayName}</span>}
          <button
            type="button"
            onClick={() => setShowProfile((prev) => !prev)}
            className="hover:text-indigo-600 transition text-lg"
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
      </div>

      {showProfile && (
        <div className="absolute right-6 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 p-5 text-gray-700">
          <h3 className="text-base font-semibold mb-4">Profile</h3>

          {loadingProfile && (
            <p className="text-sm text-gray-500 mb-3">Loading latest profile...</p>
          )}

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
              className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-500 transition"
            >
              Update Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;

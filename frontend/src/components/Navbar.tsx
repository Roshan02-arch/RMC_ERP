import { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { normalizeRole } from "../utils/auth";
import { Sun, Moon, Bell, User, LogOut, Settings, Search } from "lucide-react";
import { ThemeContext } from "../utils/ThemeContext";

type UserProfile = {
  id: number;
  name: string;
  email: string;
  number: string;
};

const Navbar = () => {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
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
  // TODO: wire up search filtering once a search API is available
  const [searchQuery, setSearchQuery] = useState("");

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

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left – title */}
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 hidden sm:block">
          RMC ERP
        </h1>

        {/* Centre – search */}
        <div className="relative flex-1 max-w-md mx-4">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 pl-9 pr-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Right – actions */}
        <div className="flex items-center gap-3">
          {/* Dark mode toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notifications */}
          <button
            type="button"
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>

          {/* User avatar / name */}
          <button
            type="button"
            onClick={() => setShowProfile((prev) => !prev)}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300">
              <User size={16} />
            </span>
            {displayName && (
              <span className="hidden md:inline max-w-[120px] truncate">
                {displayName}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Profile dropdown */}
      {showProfile && (
        <div className="absolute right-6 top-16 z-50 w-80 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl">
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300">
                <User size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {profile?.name || "User"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {profile?.email || "—"}
                </p>
              </div>
            </div>

            {loadingProfile && (
              <p className="text-xs text-slate-400 mb-3">Refreshing profile…</p>
            )}

            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="font-medium">Phone</span>
                <span>{profile?.number || "—"}</span>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-600 pt-3 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setShowProfile(false);
                  navigate("/customize-profile");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Settings size={16} />
                Update Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.clear();
                  navigate("/login");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;

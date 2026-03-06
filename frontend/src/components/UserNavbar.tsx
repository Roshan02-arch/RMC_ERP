import { useCallback, useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, LogOut, Settings, ChevronDown, Sun, Moon, Menu, X } from "lucide-react";
import { ThemeContext } from "../App";

type UserNavbarProps = {
  variant?: "overlay" | "solid";
};

type UserProfile = {
  id: number;
  name: string;
  email: string;
  number: string;
};

const navLinks = [
  { to: "/home", label: "Home" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/purchaseproduct", label: "Purchase Product" },
] as const;

const UserNavbar = ({ variant = "solid" }: UserNavbarProps) => {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      // Keep local fallback data visible even when API call fails.
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

  const isOverlay = variant === "overlay";

  const barClass = isOverlay
    ? "bg-transparent"
    : "bg-white dark:bg-slate-900 shadow-md border-b border-slate-200 dark:border-slate-700";

  const textClass = isOverlay
    ? "text-white"
    : "text-slate-700 dark:text-slate-200";

  const linkHover = isOverlay
    ? "hover:text-indigo-300"
    : "hover:text-indigo-600 dark:hover:text-indigo-400";

  const welcomeClass = isOverlay
    ? "text-indigo-300"
    : "text-indigo-600 dark:text-indigo-400";

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${barClass}`}>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 ${textClass}`}>
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/home" className="text-xl font-bold tracking-wide shrink-0">
            RMC <span className={isOverlay ? "text-indigo-300" : "text-indigo-600 dark:text-indigo-400"}>ERP</span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map(({ to, label }) => (
              <Link key={to} to={to} className={`${linkHover} transition-colors`}>
                {label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="hidden md:flex items-center gap-3">
            {displayName && (
              <span className={`text-sm font-medium ${welcomeClass}`}>
                Welcome, {displayName}
              </span>
            )}

            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className={`rounded-lg p-2 transition-colors ${
                isOverlay
                  ? "hover:bg-white/10"
                  : "hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Profile button */}
            <button
              type="button"
              onClick={() => setShowProfile((prev) => !prev)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isOverlay
                  ? "hover:bg-white/10"
                  : "hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${
                isOverlay
                  ? "bg-white/20 text-white"
                  : "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300"
              }`}>
                <User size={16} />
              </span>
              <ChevronDown size={14} />
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={() => {
                localStorage.clear();
                navigate("/login");
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isOverlay
                  ? "text-red-300 hover:text-red-200 hover:bg-white/10"
                  : "text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              }`}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden rounded-lg p-2 transition-colors hover:bg-white/10"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className={`md:hidden border-t ${
          isOverlay
            ? "bg-slate-900/95 backdrop-blur-sm border-white/10"
            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
        }`}>
          <div className="px-4 py-4 space-y-3">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileMenuOpen(false)}
                className={`block text-sm font-medium ${textClass} ${linkHover} transition-colors`}
              >
                {label}
              </Link>
            ))}

            <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex items-center justify-between">
              <span className={`text-sm font-medium ${welcomeClass}`}>
                {displayName ? `Welcome, ${displayName}` : "Menu"}
              </span>
              <button
                type="button"
                onClick={toggleDarkMode}
                className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setShowProfile((prev) => !prev);
              }}
              className={`flex items-center gap-2 text-sm font-medium ${textClass} ${linkHover} transition-colors`}
            >
              <User size={16} />
              Profile
            </button>

            <button
              type="button"
              onClick={() => {
                localStorage.clear();
                navigate("/login");
              }}
              className="flex items-center gap-2 text-sm font-medium text-red-500 dark:text-red-400 hover:text-red-600 transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Profile dropdown */}
      {showProfile && (
        <div className="absolute right-4 sm:right-6 top-[4.5rem] z-50 w-80 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl">
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

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={profile?.name || ""}
                  readOnly
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Email ID</label>
                <input
                  type="text"
                  value={profile?.email || ""}
                  readOnly
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Number</label>
                <input
                  type="text"
                  value={profile?.number || ""}
                  readOnly
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                />
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
                onClick={() => setShowProfile(false)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={16} />
                Close
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
    </div>
  );
};

export default UserNavbar;

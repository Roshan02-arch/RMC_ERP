import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { normalizeRole } from "../../utils/auth";
import profileBg from "../../assets/background.png";

type ProfileForm = {
  name: string;
  email: string;
  number: string;
  address: string;
};

type ApiResult = {
  ok: boolean;
  status: number;
  message: string;
};

const getFallbackProfile = (): ProfileForm => ({
  name: localStorage.getItem("username") || "",
  email: localStorage.getItem("userEmail") || "",
  number: localStorage.getItem("userNumber") || "",
  address: localStorage.getItem("userAddress") || "",
});

const parseApiResult = async (
  response: Response,
  defaultMessage: string
): Promise<ApiResult> => {
  const raw = await response.text();
  let message = defaultMessage;

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.message === "string" && parsed.message.trim()) {
        message = parsed.message;
      }
    } catch {
      message = raw;
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    message,
  };
};

const CustomizeProfile = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");

  const [form, setForm] = useState<ProfileForm>(getFallbackProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      let response = await fetch(`http://localhost:8080/api/users/${userId}/profile`);
      if (!response.ok) {
        response = await fetch(`http://localhost:8080/api/users/${userId}`);
      }
      if (!response.ok) {
        throw new Error("Unable to load profile");
      }

      const data = await response.json();
      const nextForm: ProfileForm = {
        name: data.name || "",
        email: data.email || "",
        number: data.number || "",
        address: data.address || "",
      };

      setForm(nextForm);
      localStorage.setItem("username", nextForm.name);
      localStorage.setItem("userEmail", nextForm.email);
      localStorage.setItem("userNumber", nextForm.number);
      localStorage.setItem("userAddress", nextForm.address);
    } catch {
      setForm(getFallbackProfile());
      setError("Unable to fetch latest profile. Showing saved details.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const role = normalizeRole(localStorage.getItem("role"));
    if (role !== "CUSTOMER" || !userId) {
      navigate("/login");
      return;
    }

    void fetchProfile();
  }, [fetchProfile, navigate, userId]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!userId) {
      setError("Please log in again.");
      navigate("/login");
      return;
    }

    const name = form.name.trim();
    const email = form.email.trim();
    const number = form.number.trim();
    const address = form.address.trim();

    if (!name || !email || !number) {
      setError("Name, email and number are required");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setSaving(true);
    try {
      const primaryResponse = await fetch(
        `http://localhost:8080/api/users/${userId}/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            number,
            address,
          }),
        }
      );

      let result = await parseApiResult(
        primaryResponse,
        "Profile updated successfully"
      );

      if (!result.ok && (result.status === 404 || result.status === 405)) {
        const currentUserResponse = await fetch(
          `http://localhost:8080/api/users/${userId}`
        );
        if (!currentUserResponse.ok) {
          const currentUserResult = await parseApiResult(
            currentUserResponse,
            "Unable to update profile"
          );
          setError(currentUserResult.message);
          return;
        }

        const currentUser = await currentUserResponse.json();
        const legacyUpdateResponse = await fetch(
          `http://localhost:8080/api/users/${userId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...currentUser,
              name,
              email,
              number,
              address,
            }),
          }
        );
        result = await parseApiResult(
          legacyUpdateResponse,
          "Profile updated successfully"
        );
      }

      if (!result.ok) {
        setError(result.message || "Unable to update profile");
        return;
      }

      localStorage.setItem("username", name);
      localStorage.setItem("userEmail", email);
      localStorage.setItem("userNumber", number);
      localStorage.setItem("userAddress", address);
      window.dispatchEvent(new Event("profile-updated"));

      await fetchProfile();
      setSuccess("Profile updated successfully");
    } catch {
      setError("Unable to update profile right now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="relative min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${profileBg})` }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/45" />

      {/* Content */}
      <div className="relative z-10 px-6 pb-10 pt-24">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-white/20 bg-white/90 p-8 shadow-[0_22px_55px_rgba(0,0,0,0.28)] backdrop-blur-md sm:p-10">
          <div className="mb-8 border-b border-slate-200 pb-5">
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              Customize Profile
            </h1>
          </div>

          {loading ? (
            <p className="text-sm text-slate-600">Loading profile...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {success && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="number"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Mobile Number
                  </label>
                  <input
                    id="number"
                    name="number"
                    type="text"
                    value={form.number}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="address"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Address
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    rows={4}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
                <button
                  type="button"
                  onClick={() => navigate("/home")}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.25)] transition hover:bg-blue-500 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomizeProfile;
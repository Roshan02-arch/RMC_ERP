import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { normalizeRole } from "../../utils/auth";

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

const parseApiResult = async (response: Response, defaultMessage: string): Promise<ApiResult> => {
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

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      const primaryResponse = await fetch(`http://localhost:8080/api/users/${userId}/profile`, {
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
      });

      let result = await parseApiResult(primaryResponse, "Profile updated successfully");

      if (!result.ok && (result.status === 404 || result.status === 405)) {
        const currentUserResponse = await fetch(`http://localhost:8080/api/users/${userId}`);
        if (!currentUserResponse.ok) {
          const currentUserResult = await parseApiResult(currentUserResponse, "Unable to update profile");
          setError(currentUserResult.message);
          return;
        }

        const currentUser = await currentUserResponse.json();
        const legacyUpdateResponse = await fetch(`http://localhost:8080/api/users/${userId}`, {
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
        });
        result = await parseApiResult(legacyUpdateResponse, "Profile updated successfully");
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
    <div className="min-h-screen bg-gray-100">
      <div className="pt-24 px-6 pb-8">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h1 className="text-2xl font-semibold text-gray-800 mb-1">Customize Profile</h1>
          <p className="text-sm text-gray-500 mb-6">Edit your details and save them to your account.</p>

          {loading ? (
            <p className="text-sm text-gray-500">Loading profile...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {success && <p className="text-sm text-green-600">{success}</p>}

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number
                </label>
                <input
                  id="number"
                  name="number"
                  type="text"
                  value={form.number}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  id="address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate("/home")}
                  className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60 transition"
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

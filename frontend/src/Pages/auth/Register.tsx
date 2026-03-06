import { useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Phone, Lock, Eye, EyeOff, Building2 } from "lucide-react";

interface RegisterFormData {
  name: string;
  email: string;
  number: string;
  password: string;
  role: string;
}

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<RegisterFormData>({
    name: "",
    email: "",
    number: "",
    password: "",
    role: "CUSTOMER",
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMsg(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const name = formData.name.trim();
    const email = formData.email.trim();
    const number = formData.number.trim();
    const password = formData.password;

    if (!name) {
      setErrorMsg("Full Name is required");
      return;
    }
    if (name.length < 3) {
      setErrorMsg("Name must be at least 3 characters long");
      return;
    }
    if (!/^[A-Za-z ]+$/.test(name)) {
      setErrorMsg("Name should contain only letters and spaces");
      return;
    }
    if (!email) {
      setErrorMsg("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg("Please enter a valid email address");
      return;
    }
    if (!number) {
      setErrorMsg("Mobile number is required");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(number)) {
      setErrorMsg("Enter valid 10-digit Indian mobile number");
      return;
    }
    if (!password) {
      setErrorMsg("Password is required");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long");
      return;
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      setErrorMsg("Password must contain at least one uppercase letter");
      return;
    }
    if (!/(?=.*[0-9])/.test(password)) {
      setErrorMsg("Password must contain at least one number");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await axios.post(
        "http://localhost:8080/api/users/register",
        { name, email, number, password, role: formData.role },
        { headers: { "Content-Type": "application/json" } },
      );

      alert(
        response.data?.message ||
          "Account created successfully! Redirecting to Login...",
      );
      navigate("/login");
    } catch (error: unknown) {
      let errMsg = "Registration failed";
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        errMsg = String(error.response.data.message);
      }

      if (errMsg === "User already exists") {
        alert("User already exists");
      } else {
        setErrorMsg(errMsg);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800 p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Branding Panel */}
        <div className="md:w-5/12 bg-gradient-to-br from-blue-600 to-indigo-700 p-10 flex flex-col justify-center text-white relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-white/5 rounded-full" />
          <div className="absolute top-1/2 right-0 w-24 h-24 bg-white/10 rounded-full" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Building2 className="w-7 h-7" />
              </div>
              <span className="text-2xl font-bold">RMC ERP</span>
            </div>
            <h2 className="text-3xl font-bold mb-4">Join Us Today</h2>
            <p className="text-blue-100 leading-relaxed">
              Create your account to start managing orders, track deliveries,
              and streamline your concrete business.
            </p>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="md:w-7/12 p-8 md:p-10">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900">
              Create Account
            </h3>
            <p className="text-gray-500 mt-1">
              Fill in your details to get started
            </p>
          </div>

          {errorMsg && (
            <div
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600"
              role="alert"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="John Doe"
                  aria-label="Full Name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="reg-email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  id="reg-email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="you@example.com"
                  aria-label="Email Address"
                />
              </div>
            </div>

            {/* Mobile */}
            <div>
              <label
                htmlFor="number"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  id="number"
                  name="number"
                  maxLength={10}
                  value={formData.number}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="9876543210"
                  aria-label="Mobile Number"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="reg-password"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="reg-password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-11 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Min 6 chars, 1 uppercase, 1 number"
                  aria-label="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Role Select */}
            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Select Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                aria-label="Select Role"
              >
                <option value="CUSTOMER">Customer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Creating Account..." : "Register"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-700 font-medium transition"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;

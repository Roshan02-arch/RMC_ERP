import { useState, FormEvent } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";

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

    // 🔹 Name Validation
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

    // 🔹 Email Validation
    if (!email) {
      setErrorMsg("Email is required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg("Please enter a valid email address");
      return;
    }

    // 🔹 Mobile Validation
    if (!number) {
      setErrorMsg("Mobile number is required");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(number)) {
      setErrorMsg("Enter valid 10-digit Indian mobile number");
      return;
    }

    // 🔹 Password Validation
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
      await axios.post(
        "http://localhost:8080/api/users/register",
        {
          name,
          email,
          number,
          password,
          role: formData.role   // 👈 ADD THIS LINE
        },
        { headers: { "Content-Type": "application/json" } }
      );

      alert("Account created successfully! Redirecting to Login...");
      navigate("/login");

    } catch (error: any) {

        let errMsg = "Registration failed";

        if (error.response?.data?.message) {
          errMsg = error.response.data.message;
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
    <div
      className="relative min-h-screen flex items-center justify-center
      bg-gradient-to-br from-blue-50 to-blue-100
      bg-[radial-gradient(circle,_rgba(0,0,0,0.04)_1px,_transparent_1px)]
      bg-[size:40px_40px] overflow-hidden"
    >
    {/* Top Right Navbar */}
        <div className="absolute top-0 right-0 p-6 flex gap-6 text-sm font-medium text-gray-600">
          <Link to="/" className="hover:text-indigo-600 transition-colors">
            Home
          </Link>
          <Link to="/login" className="hover:text-indigo-600 transition-colors">
            Login
          </Link>
          <Link to="/register" className="text-indigo-600 font-semibold">
            Register
          </Link>
        </div>
      {/* Register Card */}
      <div className="relative w-full max-w-md bg-white/90 backdrop-blur-sm
                      shadow-2xl rounded-2xl p-8 border border-gray-100">

        <h2 className="text-3xl font-bold text-center text-gray-800">
          Create Your Account
        </h2>
        <p className="text-center text-gray-500 mt-2 mb-6">
          Join us and start your journey
        </p>

        {errorMsg && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 animate-shake">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm
                         focus:ring-2 focus:ring-indigo-500/30
                         focus:border-indigo-500 outline-none transition"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm
                         focus:ring-2 focus:ring-indigo-500/30
                         focus:border-indigo-500 outline-none transition"
            />
          </div>

          {/* Mobile */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              name="number"
              maxLength={10}
              value={formData.number}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm
                         focus:ring-2 focus:ring-indigo-500/30
                         focus:border-indigo-500 outline-none transition"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-11 text-sm
                           focus:ring-2 focus:ring-indigo-500/30
                           focus:border-indigo-500 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* Role Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Role
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm
                         focus:ring-2 focus:ring-indigo-500/30
                         focus:border-indigo-500 outline-none transition bg-white"
            >
              <option value="CUSTOMER">Customer</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white
                       py-3 rounded-lg font-medium transition shadow-md
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

        </form>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-indigo-600 font-medium hover:text-indigo-500"
          >
            Sign in
          </a>
        </p>

      </div>
    </div>
  );
}

export default Register;
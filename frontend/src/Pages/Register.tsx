import { useState, FormEvent } from "react";
import axios from "axios";
import "../Css/Register.css";

interface RegisterFormData {
  name: string;
  email: string;
  number: string;
  password: string;
}

function Register() {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: "",
    email: "",
    number: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errorMsg || successMsg) {
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formData.password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(formData.number)) {
      setErrorMsg("Please enter a valid 10-digit Indian mobile number");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await axios.post(
        "http://localhost:8080/api/users/register",
        formData,
        { headers: { "Content-Type": "application/json" } }
      );

      setSuccessMsg(response.data?.message || "Account created successfully!");

      setFormData({ name: "", email: "", number: "", password: "" });
    } catch (error: any) {
      const errMsg =
        error.response?.data?.message ||
        error.response?.data ||
        error.message ||
        "Registration failed. Please try again.";
      setErrorMsg(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Create Your Account</h2>

        {successMsg && <div className="success-message">{successMsg}</div>}
        {errorMsg && <div className="error-message">{errorMsg}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="input-group">
            <input
              type="text"
              name="name"
              id="name"
              placeholder=" "
              value={formData.name}
              onChange={handleChange}
              required
              autoComplete="name"
            />
            <label htmlFor="name">Full Name</label>
          </div>

          <div className="input-group">
            <input
              type="email"
              name="email"
              id="email"
              placeholder=" "
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
            <label htmlFor="email">Email Address</label>
          </div>

          <div className="input-group">
            <input
              type="tel"
              name="number"
              id="number"
              placeholder=" "
              value={formData.number}
              onChange={handleChange}
              required
              pattern="[6-9][0-9]{9}"
              maxLength={10}
              autoComplete="tel"
            />
            <label htmlFor="number">Mobile Number</label>
          </div>

          <div className="input-group">
            <input
              type="password"
              name="password"
              id="password"
              placeholder=" "
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              autoComplete="new-password"
            />
            <label htmlFor="password">Password</label>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        {/* Professional login section at bottom */}
        <div className="auth-footer">
          <p>Already have an account?</p>
          <a href="/login" className="login-link">
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}

export default Register;
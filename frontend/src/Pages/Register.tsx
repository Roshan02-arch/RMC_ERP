import { useState, FormEvent } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../Css/Register.css";

interface RegisterFormData {
  name: string;
  email: string;
  number: string;
  password: string;
}

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<RegisterFormData>({
    name: "",
    email: "",
    number: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        { name, email, number, password },
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
    <div className="container">
      <div className="card">
        <h2>Create Your Account</h2>

        {errorMsg && <div className="error-message">{errorMsg}</div>}

        <form onSubmit={handleSubmit} noValidate>

          <div className="input-group">
            <input
              type="text"
              name="name"
              placeholder=" "
              value={formData.name}
              onChange={handleChange}
              required
            />
            <label>Full Name</label>
          </div>

          <div className="input-group">
            <input
              type="email"
              name="email"
              placeholder=" "
              value={formData.email}
              onChange={handleChange}
              required
            />
            <label>Email Address</label>
          </div>

          <div className="input-group">
            <input
              type="tel"
              name="number"
              placeholder=" "
              value={formData.number}
              onChange={handleChange}
              required
              maxLength={10}
            />
            <label>Mobile Number</label>
          </div>

          <div className="input-group">
            <input
              type="password"
              name="password"
              placeholder=" "
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
            <label>Password</label>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>

        </form>

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
import { useState } from "react";
import "../Css/Login.css";

const Login = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    setErrorMsg(null);

    // 🔹 Email Required
    if (!trimmedEmail) {
      setErrorMsg("Email is required");
      return;
    }

    // 🔹 Valid Email Format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg("Please enter a valid email address");
      return;
    }

    // 🔹 Password Required
    if (!trimmedPassword) {
      setErrorMsg("Password is required");
      return;
    }

    // 🔹 Strong Password Rules
    if (trimmedPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long");
      return;
    }

    if (!/(?=.*[A-Z])/.test(trimmedPassword)) {
      setErrorMsg("Password must contain at least one uppercase letter");
      return;
    }

    if (!/(?=.*[0-9])/.test(trimmedPassword)) {
      setErrorMsg("Password must contain at least one number");
      return;
    }

    setLoading(true);

    // Simulate login process
    setTimeout(() => {
      console.log("Login Data:", {
        email: trimmedEmail,
        password: trimmedPassword,
      });

      alert("Login Successful 🎉");
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">RMC ERP Login</h2>

        {errorMsg && (
          <div className="error-message">{errorMsg}</div>
        )}

        <form onSubmit={handleSubmit} className="login-form">

          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMsg(null);
              }}
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMsg(null);
              }}
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>
      </div>
    </div>
  );
};

export default Login;
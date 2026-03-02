import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";

type LocationState = {
  email?: string;
};

function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as LocationState) || {};

  const [email, setEmail] = useState(state.email || "");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim() || !otp.trim()) {
      setError("Email and verification code are required.");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post("http://localhost:8080/api/users/verify-reset-otp", {
        email: email.trim(),
        otp: otp.trim(),
      });
      setOtpVerified(true);
      setMessage(response.data.message || "Code verified. Enter your new password.");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(String(err.response.data.message));
      } else {
        setError("Unable to verify code.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post("http://localhost:8080/api/users/reset-password", {
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });
      setMessage(response.data.message || "Password updated successfully.");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(String(err.response.data.message));
      } else {
        setError("Unable to update password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <h2>Reset Password</h2>

      <form onSubmit={otpVerified ? handleResetPassword : handleVerifyOtp}>
        <input
          type="email"
          placeholder="Registered email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          required
          disabled={otpVerified}
        />

        <input
          type="text"
          placeholder="Enter verification code"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          style={inputStyle}
          required
          disabled={otpVerified}
        />

        {!otpVerified && (
          <button type="submit" style={buttonStyle} disabled={loading}>
            {loading ? "Verifying..." : "Verify Code"}
          </button>
        )}

        {otpVerified && (
          <>
            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={inputStyle}
              required
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputStyle}
              required
            />

            <button type="submit" style={buttonStyle} disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </>
        )}
      </form>

      {message && <p style={{ color: "green", marginTop: "15px" }}>{message}</p>}
      {error && <p style={{ color: "red", marginTop: "15px" }}>{error}</p>}
    </div>
  );
}

const containerStyle = {
  width: "340px",
  margin: "100px auto",
  textAlign: "center" as const,
  padding: "25px",
  border: "1px solid #ddd",
  borderRadius: "10px",
  boxShadow: "0 6px 15px rgba(0,0,0,0.1)",
  backgroundColor: "#fff",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "15px",
  borderRadius: "6px",
  border: "1px solid #ccc",
};

const buttonStyle = {
  padding: "10px 20px",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  backgroundColor: "#1976d2",
  color: "white",
  fontWeight: "bold",
};

export default ResetPassword;

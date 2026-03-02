import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { normalizeRole } from "../../utils/auth";
type LoginForm = {
  email: string;
  password: string;
};

const Login = () => {
  const navigate = useNavigate();
  const floatingSymbols = [
    { icon: "⌨️", top: "15%", left: "10%", delay: "0s", duration: "6s" },
    { icon: "🖥️", top: "25%", right: "15%", delay: "1s", duration: "7s" },
    { icon: "📱", bottom: "30%", left: "20%", delay: "2s", duration: "8s" },
    { icon: "💻", top: "40%", right: "25%", delay: "3s", duration: "7.5s" },
    { icon: "🔌", bottom: "20%", right: "10%", delay: "4s", duration: "8.2s" },
    { icon: "🖱️", top: "35%", left: "30%", delay: "0.5s", duration: "6.5s" },
    { icon: "⚡", bottom: "35%", right: "30%", delay: "2.2s", duration: "7.2s" },
    { icon: "💾", top: "20%", left: "40%", delay: "3.1s", duration: "8.4s" },
    { icon: "📊", bottom: "25%", left: "35%", delay: "1.4s", duration: "6.9s" },
    { icon: "🔍", top: "30%", right: "40%", delay: "4.3s", duration: "7.8s" },
    { icon: "⚙️", top: "45%", left: "15%", delay: "2.6s", duration: "8.1s" },
    { icon: "🔒", bottom: "40%", right: "20%", delay: "3.4s", duration: "7.4s" },
    { icon: "📡", top: "10%", left: "45%", delay: "1.5s", duration: "8.6s" },
    { icon: "🌐", bottom: "15%", right: "45%", delay: "2.5s", duration: "7.6s" },
    { icon: "🔋", top: "50%", left: "5%", delay: "3.5s", duration: "6.8s" },
    { icon: "💡", bottom: "45%", right: "5%", delay: "4.5s", duration: "7.1s" },
    { icon: "📶", top: "5%", right: "35%", delay: "1.8s", duration: "8.3s" },
    { icon: "🔄", bottom: "5%", left: "25%", delay: "2.8s", duration: "7.3s" },
    { icon: "⌘", top: "55%", right: "15%", delay: "3.8s", duration: "8.5s" },
    { icon: "⌥", bottom: "50%", left: "45%", delay: "4.8s", duration: "7.7s" },
    { icon: "⇧", top: "15%", right: "50%", delay: "1.2s", duration: "8s" },
    { icon: "⌃", bottom: "10%", left: "50%", delay: "2.2s", duration: "7.9s" },
    { icon: "⎋", top: "60%", left: "55%", delay: "3.2s", duration: "8.7s" },
    { icon: "⏎", bottom: "55%", right: "55%", delay: "4.2s", duration: "7.5s" },
  ];
  const [formData, setFormData] = useState<LoginForm>({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const role = normalizeRole(localStorage.getItem("role"));
    console.log("[Login] role in localStorage:", role);
    if (role === "ADMIN") {
      console.log("[Login] redirecting to /admin");
      navigate("/admin");
      return;
    }
    if (role === "CUSTOMER") {
      console.log("[Login] redirecting to /home");
      navigate("/home");
    }
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    if (!formData.email.includes("@")) {
      setError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:8080/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

 const text = await response.text();
 console.log("RAW RESPONSE:", text);

 let data;
 try {
   data = JSON.parse(text);
 } catch (e) {
   console.error("Invalid JSON from backend");
   setError("Server returned invalid response");
   return;
 }

      if (!response.ok) {
        setError(data.message || "Invalid email or password");
        return;
      }

      const role = normalizeRole(data.role);
      localStorage.setItem("role", role);
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("username", data.name || formData.email.split("@")[0]);
      localStorage.setItem("userEmail", data.email || formData.email);
      localStorage.setItem("userNumber", data.number || "");
      localStorage.setItem("userAddress", data.address || "");

      if (role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/home");
      }
    } catch {
      setError("Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100 relative overflow-hidden">
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-end gap-6 text-sm font-medium text-gray-700">
          <Link to="/home" className="hover:text-indigo-600 transition">
            Home
          </Link>
          <Link to="/register" className="hover:text-indigo-600 transition">
            Register
          </Link>
          <Link to="/login" className="text-indigo-600">
            Login
          </Link>
        </div>
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiA0NGMwIDYuNjI3LTUuMzczIDEyLTEyIDEyUzEyIDUwLjYyNyAxMiA0NCAxNy4zNzMgMzIgMjQgMzJzMTIgNS4zNzMgMTIgMTJ6IiBmaWxsPSIjZWVlIi8+PC9nPjwvc3ZnPg==')] opacity-40"></div>

      {/* Animated Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob" style={{ animationDelay: "0s", animationDuration: "8s" }}></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-slate-200 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob" style={{ animationDelay: "2s", animationDuration: "9s" }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob" style={{ animationDelay: "4s", animationDuration: "10s" }}></div>
      </div>

      {/* Floating Tech Symbols */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        {floatingSymbols.map((item, index) => (
          <span
            key={`${item.icon}-${index}`}
            className="absolute text-2xl text-blue-500/30 animate-float"
            style={{
              top: item.top,
              bottom: item.bottom,
              left: item.left,
              right: item.right,
              animationDelay: item.delay,
              animationDuration: item.duration,
            }}
          >
            {item.icon}
          </span>
        ))}
      </div>

      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-lg shadow-lg w-full max-w-md transform transition-all duration-500 ease-in-out animate-fadeIn relative border-0">
        {/* Animated Icons */}
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 flex items-center space-x-8">
          <div className="animate-bookOpen">
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="animate-bulbLight">
            <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="animate-gearSpin">
            <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>

        <div className="text-center mb-8 animate-slideDown">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Welcome Back</h2>
          <p className="text-slate-600">Sign in to continue your learning journey</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-md mb-4 animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="transform transition-all duration-500 hover:translate-x-1">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white/70 backdrop-blur-sm"
              placeholder="Enter your email"
            />
          </div>

          <div className="transform transition-all duration-500 hover:translate-x-1">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
             <div className="relative">
            <input
            type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white/70 backdrop-blur-sm"
              placeholder="Enter your password"
            />
 <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-500 hover:text-blue-500 transition"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
              </div>

          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform transition-all duration-300 hover:scale-[1.02] ${
              isLoading ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-6 text-center transform transition-all duration-500 hover:translate-y-[-2px]">
          <p className="text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="text-blue-500 hover:text-blue-600 font-medium transition-colors duration-200">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

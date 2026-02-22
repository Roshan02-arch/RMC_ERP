import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // ✅ Auto redirect if already logged in
  useEffect(() => {
    const role = localStorage.getItem("role");

    if (role === "ADMIN") {
      navigate("/admin");
    } else if (role === "CUSTOMER") {
      navigate("/login");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch("http://localhost:8080/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.message || "Login failed");
        setLoading(false);
        return;
      }

      // ✅ Save role & userId
      localStorage.setItem("role", data.role);
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("username", data.name || email.split("@")[0]);
      localStorage.setItem("userEmail", data.email || email);
      localStorage.setItem("userNumber", data.number || "");
      localStorage.setItem("userAddress", data.address || "");

      // ✅ Redirect based on role
      if (data.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/home");
      }

    } catch (error) {
      setErrorMsg("Server error. Please try again.");
      setLoading(false);
    }
  };

 return (
   <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 relative">

     {/* Top Navbar */}
     <div className="absolute top-0 right-0 p-6 flex gap-6 text-sm font-medium text-gray-600">
       <Link to="/" className="hover:text-indigo-600 transition-colors">
         Home
       </Link>
       <Link to="/login" className="hover:text-indigo-600 transition-colors">
         Login
       </Link>
       <Link to="/register" className="hover:text-indigo-600 transition-colors">
         Register
       </Link>
     </div>

     {/* Center Card */}
     <div className="flex items-center justify-center min-h-screen px-4">

       <div className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-2xl rounded-2xl p-8 border border-gray-100">

         {/* Heading */}
         <div className="text-center mb-8">
           <h1 className="text-3xl font-bold text-gray-800">
             Welcome Back
           </h1>
           <p className="text-gray-500 mt-2">
             Sign in to continue your learning journey
           </p>
         </div>

         {/* Error Message */}
         {errorMsg && (
           <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
             {errorMsg}
           </div>
         )}

         <form className="space-y-6" onSubmit={handleSubmit}>

           {/* Email */}
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">
               Email Address
             </label>
             <input
               type="email"
               required
               value={email}
               onChange={(e) => {
                 setEmail(e.target.value)
                 setErrorMsg(null)
               }}
               placeholder="Enter your email"
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
                 required
                 value={password}
                 onChange={(e) => {
                   setPassword(e.target.value)
                   setErrorMsg(null)
                 }}
                 placeholder="Enter your password"
                 className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm pr-11
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

           {/* Button */}
           <button
             type="submit"
             disabled={loading}
             className="w-full bg-indigo-600 hover:bg-indigo-500 text-white
                        py-3 rounded-lg font-medium transition shadow-md
                        disabled:opacity-60 disabled:cursor-not-allowed"
           >
             {loading ? "Signing in..." : "Sign In"}
           </button>
         </form>

         {/* Bottom Link */}
         <p className="text-center text-sm text-gray-500 mt-6">
           Don't have an account?{" "}
           <Link
             to="/register"
             className="text-indigo-600 font-medium hover:text-indigo-500"
           >
             Sign up
           </Link>
         </p>
       </div>
     </div>
   </div>
 )
};

export default Login;

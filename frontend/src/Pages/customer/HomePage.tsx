import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { normalizeRole } from "../../utils/auth";
import {
  ArrowRight,
  Building2,
  Shield,
  Truck,
  BarChart3,
  Warehouse,
  MapPin,
  Monitor,
} from "lucide-react";

const slides = [
  {
    image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc",
    title: "Premium Ready Mix Concrete",
    subtitle: "High quality concrete delivered on time.",
  },
  {
    image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e",
    title: "Strong Foundations Start Here",
    subtitle: "Trusted by engineers & builders.",
  },
  {
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd",
    title: "Smart ERP for RMC Industry",
    subtitle: "Manage orders, dispatch & delivery easily.",
  },
];

const HomePage = () => {
  const [current, setCurrent] = useState(0);
  const role = normalizeRole(localStorage.getItem("role"));

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Visitor Navbar */}
      {role !== "CUSTOMER" && (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-md border-b border-white/20">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center gap-2 text-white font-bold text-xl"
            >
              <Building2 className="w-7 h-7" />
              RMC ERP
            </Link>
            <div className="flex items-center gap-6 text-sm font-medium text-white/90">
              <Link to="/" className="hover:text-white transition">
                Home
              </Link>
              <Link to="/login" className="hover:text-white transition">
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
              >
                Register
              </Link>
            </div>
          </div>
        </nav>
      )}

      {/* Hero Carousel */}
      <div className="relative h-screen overflow-hidden">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === current ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
          </div>
        ))}

        {/* Hero Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-6 z-10">
          <h1
            className="text-5xl md:text-7xl font-extrabold mb-4 drop-shadow-lg"
            style={{ textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}
          >
            {slides[current].title}
          </h1>
          <p
            className="text-lg md:text-2xl mb-10 max-w-2xl text-white/90"
            style={{ textShadow: "0 2px 10px rgba(0,0,0,0.4)" }}
          >
            {slides[current].subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to={role === "CUSTOMER" ? "/purchaseproduct" : "/login"}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#about"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-transparent border-2 border-white/60 hover:border-white hover:bg-white/10 text-white font-semibold rounded-xl transition-all"
            >
              Learn More <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Dots Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-10">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrent(index)}
              className={`h-3 rounded-full transition-all ${
                index === current
                  ? "bg-white w-8"
                  : "bg-white/50 hover:bg-white/70 w-3"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* About Section */}
      <section id="about" className="bg-slate-50 py-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <img
              src="src/images/about.jpg"
              alt="RMC Plant"
              className="rounded-2xl shadow-xl w-full object-cover"
            />
          </div>

          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              About RMC ERP
            </h2>
            <p className="text-gray-600 mb-4 leading-relaxed text-lg">
              RMC ERP is a powerful enterprise management system built
              specifically for Ready Mix Concrete industries. It streamlines
              order processing, production scheduling, dispatch tracking, and
              customer management.
            </p>
            <p className="text-gray-600 mb-10 leading-relaxed text-lg">
              Our smart automation tools help reduce delays, increase
              efficiency, and improve overall operational control across plants
              and delivery networks.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl text-center shadow-md hover:shadow-lg transition">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                  Quality Control
                </h3>
                <p className="text-sm text-gray-500">
                  Maintain consistent and high-grade concrete standards.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl text-center shadow-md hover:shadow-lg transition">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Truck className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                  Fast Dispatch
                </h3>
                <p className="text-sm text-gray-500">
                  Real-time delivery tracking and scheduling.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl text-center shadow-md hover:shadow-lg transition">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                  Smart Analytics
                </h3>
                <p className="text-sm text-gray-500">
                  Data-driven insights for business growth.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Our Services
          </h2>
          <p className="text-gray-500 mb-12 max-w-2xl mx-auto text-lg">
            Comprehensive solutions for the Ready Mix Concrete industry
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition group border border-gray-100">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-600 transition">
                <Warehouse className="w-8 h-8 text-blue-600 group-hover:text-white transition" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Concrete Supply
              </h3>
              <p className="text-gray-500">
                High-quality ready mix concrete for residential, commercial and
                industrial projects.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition group border border-gray-100">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-emerald-600 transition">
                <MapPin className="w-8 h-8 text-emerald-600 group-hover:text-white transition" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Logistics Management
              </h3>
              <p className="text-gray-500">
                Smart scheduling and real-time tracking for efficient and timely
                deliveries.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition group border border-gray-100">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-purple-600 transition">
                <Monitor className="w-8 h-8 text-purple-600 group-hover:text-white transition" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                ERP Solutions
              </h3>
              <p className="text-gray-500">
                Complete digital management system for plant, orders, dispatch,
                and billing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-gray-400 py-16 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-xl mb-4">
              <Building2 className="w-6 h-6" />
              RMC ERP
            </div>
            <p className="text-sm leading-relaxed">
              A powerful enterprise management system built for the Ready Mix
              Concrete industry.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-white transition">
                  Home
                </Link>
              </li>
              <li>
                <a href="#about" className="hover:text-white transition">
                  About
                </a>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition">
                  Register
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li>info@rmcerp.com</li>
              <li>+91 1234 567 890</li>
              <li>Mumbai, India</li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-slate-800 text-center text-sm">
          © {new Date().getFullYear()} RMC ERP. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
};

export default HomePage;

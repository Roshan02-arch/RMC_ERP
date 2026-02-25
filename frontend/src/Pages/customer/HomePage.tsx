import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import UserNavbar from "../../components/UserNavbar";

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
  const [username] = useState<string | null>(() => {
    const storedUser = localStorage.getItem("username");
    if (
      storedUser &&
      storedUser.trim() !== "" &&
      storedUser !== "undefined" &&
      storedUser !== "null"
    ) {
      return storedUser;
    }
    return null;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">

      {/* Navbar */}
      {username ? (
        <UserNavbar variant="overlay" />
      ) : (
        <div className="absolute top-0 right-0 p-6 flex gap-6 text-sm font-medium text-white z-50">
          <Link to="/" className="hover:text-indigo-300 transition">
            Home
          </Link>
          <Link to="/login" className="hover:text-indigo-300 transition">
            Login
          </Link>
          <Link to="/register" className="hover:text-indigo-300 transition">
            Register
          </Link>
        </div>
      )}

      {/* Slider */}
      <div className="relative h-screen overflow-hidden">

        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === current ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={slide.image}
              alt="slide"
              className="w-full h-full object-cover"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-center text-white px-6">
              <h1 className="text-5xl font-bold mb-6">
                {slide.title}
              </h1>

              <p className="text-lg mb-8 max-w-xl">
                {slide.subtitle}
              </p>

              <Link
                to={username ? "/purchaseproduct" : "/login"}
                className="px-6 py-3 bg-indigo-600 rounded-lg hover:bg-indigo-500 transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        ))}

      </div>

      {/* ================= About Section ================= */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">

          {/* Image */}
          <div>
            {/* Replace this image with your own later */}
            <img
              src="src/images/about.jpg"
              alt="RMC Plant"
              className="rounded-2xl shadow-xl w-full object-cover"
            />
          </div>

          {/* Content */}
          <div>
            <h2 className="text-4xl font-bold text-gray-800 mb-6">
              About RMC ERP
            </h2>

            <p className="text-gray-600 mb-6 leading-relaxed">
              RMC ERP is a powerful enterprise management system built
              specifically for Ready Mix Concrete industries. It streamlines
              order processing, production scheduling, dispatch tracking,
              and customer management.
            </p>

            <p className="text-gray-600 mb-8 leading-relaxed">
              Our smart automation tools help reduce delays, increase
              efficiency, and improve overall operational control across
              plants and delivery networks.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">

              <div className="bg-slate-100 p-6 rounded-xl text-center shadow hover:shadow-lg transition">
                <h3 className="text-lg font-semibold text-indigo-600 mb-2">
                  Quality Control
                </h3>
                <p className="text-sm text-gray-600">
                  Maintain consistent and high-grade concrete standards.
                </p>
              </div>

              <div className="bg-slate-100 p-6 rounded-xl text-center shadow hover:shadow-lg transition">
                <h3 className="text-lg font-semibold text-indigo-600 mb-2">
                  Fast Dispatch
                </h3>
                <p className="text-sm text-gray-600">
                  Real-time delivery tracking and scheduling.
                </p>
              </div>

              <div className="bg-slate-100 p-6 rounded-xl text-center shadow hover:shadow-lg transition">
                <h3 className="text-lg font-semibold text-indigo-600 mb-2">
                  Smart Analytics
                </h3>
                <p className="text-sm text-gray-600">
                  Data-driven insights for business growth.
                </p>
              </div>

            </div>
          </div>
        </div>
      </section>
      {/* ================= Services Section ================= */}
      <section className="bg-gray-100 py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-800 mb-12">
            Our Services
          </h2>

          <div className="grid md:grid-cols-3 gap-8">

            <div className="bg-white p-8 rounded-2xl shadow hover:shadow-xl transition">
              <h3 className="text-xl font-semibold text-indigo-600 mb-4">
                Concrete Supply
              </h3>
              <p className="text-gray-600">
                High-quality ready mix concrete for residential,
                commercial and industrial projects.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow hover:shadow-xl transition">
              <h3 className="text-xl font-semibold text-indigo-600 mb-4">
                Logistics Management
              </h3>
              <p className="text-gray-600">
                Smart scheduling and real-time tracking for
                efficient and timely deliveries.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow hover:shadow-xl transition">
              <h3 className="text-xl font-semibold text-indigo-600 mb-4">
                ERP Solutions
              </h3>
              <p className="text-gray-600">
                Complete digital management system for plant,
                orders, dispatch, and billing.
              </p>
            </div>

          </div>
        </div>
      </section>
      {/* ================================================= */}

      {/* Footer */}
      <footer className="bg-slate-900 text-gray-300 py-8 text-center">
        <h3 className="text-lg font-semibold mb-3 text-white">
          RMC ERP System
        </h3>
        <p className="text-sm">
          © {new Date().getFullYear()} RMC ERP. All Rights Reserved.
        </p>
      </footer>

    </div>
  );
};

export default HomePage;

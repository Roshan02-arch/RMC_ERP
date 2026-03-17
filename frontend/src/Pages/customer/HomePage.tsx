import { useState, useEffect } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { normalizeRole } from "../../utils/auth";
import { FaCubes, FaUserTie, FaTruckFast, FaHandshake } from "react-icons/fa6";
import GlobalFooter from "../../components/GlobalFooter";
import rmc1 from "../../assets/rmc.jpg";
import rmc2 from "../../assets/rmc1.jpg";
import rmc3 from "../../assets/RMC-Plant-HD-Image-1.webp";

const slides = [
  {
    image: rmc1,
    title: "Premium Ready Mix Concrete",
    subtitle: "High quality concrete delivered on time.",
  },
  {
    image: rmc2,
    title: "Strong Foundations Start Here",
    subtitle: "Trusted by engineers & builders.",
  },
  {
    image: rmc3,
    title: "Smart ERP for RMC Industry",
    subtitle: "Manage orders, dispatch & delivery easily.",
  },
];

const whyChooseItems = [
  {
    title: "Quality Materials",
    description:
      "We use premium-grade materials to ensure durability, safety, and long-lasting performance.",
    icon: FaCubes,
  },
  {
    title: "Experienced Team",
    description:
      "Our skilled engineers and professionals bring years of proven industry expertise.",
    icon: FaUserTie,
  },
  {
    title: "On-Time Delivery",
    description:
      "We respect your timelines and ensure every project is completed without delays.",
    icon: FaTruckFast,
  },
  {
    title: "Customer Satisfaction",
    description:
      "Our commitment to excellence ensures happy clients and long-term partnerships.",
    icon: FaHandshake,
  },
];

const HomePage = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "text-indigo-300 border-b-2 border-indigo-300 pb-1"
      : "transition hover:text-indigo-300";

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

      {/* Navbar */}
      {role !== "CUSTOMER" && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sm:justify-end gap-4 sm:gap-6 text-sm font-medium text-gray-700">

            {/* Mobile hamburger */}
            <button
              className="sm:hidden flex flex-col gap-1.5 p-1"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              <span className={`block w-6 h-0.5 bg-gray-700 transition-transform duration-300 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`block w-6 h-0.5 bg-gray-700 transition-opacity duration-300 ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block w-6 h-0.5 bg-gray-700 transition-transform duration-300 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </button>

            {/* Desktop nav links */}
            <div className="hidden sm:flex items-center gap-6">
              <NavLink to="/" className={navItemClass}>Home</NavLink>
              <NavLink to="/about-us" className={navItemClass}>About Us</NavLink>
              <NavLink to="/contact-us" className={navItemClass}>Contact Us</NavLink>
              <NavLink to="/login" className={navItemClass}>Login</NavLink>
              <NavLink to="/register" className={navItemClass}>Register</NavLink>
            </div>
          </div>

          {/* Mobile dropdown menu */}
          {menuOpen && (
            <div className="sm:hidden bg-white border-t border-gray-100 px-4 pb-4 flex flex-col gap-3 text-sm font-medium text-gray-700">
              <NavLink to="/" className={navItemClass} onClick={() => setMenuOpen(false)}>Home</NavLink>
              <NavLink to="/about-us" className={navItemClass} onClick={() => setMenuOpen(false)}>About Us</NavLink>
              <NavLink to="/contact-us" className={navItemClass} onClick={() => setMenuOpen(false)}>Contact Us</NavLink>
              <NavLink to="/login" className={navItemClass} onClick={() => setMenuOpen(false)}>Login</NavLink>
              <NavLink to="/register" className={navItemClass} onClick={() => setMenuOpen(false)}>Register</NavLink>
            </div>
          )}
        </div>
      )}

      {/* Slider */}
      <div className="relative h-screen min-h-[500px] overflow-hidden">
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
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-center text-white px-4 sm:px-6">
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4 md:mb-6 leading-tight">
                {slide.title}
              </h1>
              <p className="text-sm sm:text-base md:text-lg mb-5 sm:mb-6 md:mb-8 max-w-xs sm:max-w-md md:max-w-xl">
                {slide.subtitle}
              </p>
              <Link
                to={role === "CUSTOMER" ? "/purchaseproduct" : "/login"}
                className="px-5 py-2.5 sm:px-6 sm:py-3 bg-indigo-600 rounded-lg hover:bg-indigo-500 transition text-sm sm:text-base"
              >
                Get Started
              </Link>
            </div>
          </div>
        ))}

        {/* Slider dots */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === current ? "bg-white scale-125" : "bg-white/50"}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-blue-50 to-indigo-50">
        <div className="pointer-events-none absolute -top-16 -left-16 h-64 w-64 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -right-20 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 left-1/3 h-60 w-60 rounded-full bg-sky-200/40 blur-3xl" />

        {/* About Section */}
        <section className="py-10 sm:py-12 md:py-16 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 md:gap-10 items-start">
            <div>
              <img
                src="src\assets\about.jpg.webp"
                alt="RMC Plant"
                className="w-full h-56 sm:h-72 md:h-80 lg:h-[460px] object-cover rounded-2xl shadow-lg"
              />
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">About RMC ERP</h2>
              <p className="text-slate-600 text-sm sm:text-base md:text-lg leading-6 sm:leading-7 md:leading-8 mt-4 sm:mt-5 md:mt-6">
                RMC ERP is a powerful enterprise management system built specifically for
                Ready Mix Concrete industries. It streamlines order processing, production
                scheduling, dispatch tracking, and customer management.
              </p>
              <p className="text-slate-600 text-sm sm:text-base md:text-lg leading-6 sm:leading-7 md:leading-8 mt-3 sm:mt-4 md:mt-5">
                Our smart automation tools help reduce delays, increase efficiency, and
                improve overall operational control across plants and delivery networks.
              </p>

              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 mt-5 sm:mt-6 md:mt-8">
                <div className="bg-white/90 backdrop-blur rounded-2xl p-4 sm:p-5 text-center shadow transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">
                  <h3 className="text-indigo-600 text-lg sm:text-xl md:text-2xl font-semibold mb-2 sm:mb-3">Quality Control</h3>
                  <p className="text-slate-600 text-sm sm:text-base md:text-lg leading-6 sm:leading-7 md:leading-8">
                    Maintain consistent and high-grade concrete standards.
                  </p>
                </div>

                <div className="bg-white/90 backdrop-blur rounded-2xl p-4 sm:p-5 text-center shadow transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">
                  <h3 className="text-indigo-600 text-lg sm:text-xl md:text-2xl font-semibold mb-2 sm:mb-3">Fast Dispatch</h3>
                  <p className="text-slate-600 text-sm sm:text-base md:text-lg leading-6 sm:leading-7 md:leading-8">
                    Real-time delivery tracking and scheduling.
                  </p>
                </div>

                <div className="bg-white/90 backdrop-blur rounded-2xl p-4 sm:p-5 text-center shadow transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl xs:col-span-2 lg:col-span-1">
                  <h3 className="text-indigo-600 text-lg sm:text-xl md:text-2xl font-semibold mb-2 sm:mb-3">Smart Analytics</h3>
                  <p className="text-slate-600 text-sm sm:text-base md:text-lg leading-6 sm:leading-7 md:leading-8">
                    Data-driven insights for business growth.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-12 sm:py-14 md:py-20 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 sm:mb-10 md:mb-14">
              <p className="text-blue-600 tracking-[0.18em] text-xs sm:text-sm md:text-base font-semibold uppercase">
                Why Choose Us
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-slate-900 mt-3 sm:mt-4 md:mt-5">
                Building Trust, Delivering Excellence
              </h2>
              <p className="text-slate-600 max-w-4xl mx-auto mt-3 sm:mt-4 md:mt-6 text-sm sm:text-base md:text-lg leading-7 sm:leading-8 md:leading-9">
                With years of expertise in infrastructure and roofing solutions, we deliver quality,
                innovation, and reliability in every project.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-7">
              {whyChooseItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="bg-white/90 backdrop-blur rounded-2xl p-6 sm:p-7 md:p-10 text-center shadow transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl"
                  >
                    <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Icon className="text-2xl sm:text-3xl" />
                    </div>
                    <h3 className="text-lg sm:text-xl md:text-2xl mt-4 sm:mt-5 md:mt-7 font-semibold text-slate-900">{item.title}</h3>
                    <p className="text-slate-600 mt-3 sm:mt-4 md:mt-5 text-sm sm:text-base md:text-lg leading-6 sm:leading-7 md:leading-9">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-12 sm:py-14 md:py-20 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-8 sm:mb-10 md:mb-12">
              Our Services
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-8">
              <div className="bg-white/90 backdrop-blur p-5 sm:p-6 md:p-8 rounded-2xl shadow transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl">
                <h3 className="text-base sm:text-lg md:text-xl font-semibold text-indigo-600 mb-3 sm:mb-4">
                  Concrete Supply
                </h3>
                <p className="text-gray-600 text-sm md:text-base">
                  High-quality ready mix concrete for residential,
                  commercial and industrial projects.
                </p>
              </div>

              <div className="bg-white/90 backdrop-blur p-5 sm:p-6 md:p-8 rounded-2xl shadow transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl">
                <h3 className="text-base sm:text-lg md:text-xl font-semibold text-indigo-600 mb-3 sm:mb-4">
                  Logistics Management
                </h3>
                <p className="text-gray-600 text-sm md:text-base">
                  Smart scheduling and real-time tracking for
                  efficient and timely deliveries.
                </p>
              </div>

              <div className="bg-white/90 backdrop-blur p-5 sm:p-6 md:p-8 rounded-2xl shadow transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl sm:col-span-2 md:col-span-1">
                <h3 className="text-base sm:text-lg md:text-xl font-semibold text-indigo-600 mb-3 sm:mb-4">
                  ERP Solutions
                </h3>
                <p className="text-gray-600 text-sm md:text-base">
                  Complete digital management system for plant,
                  orders, dispatch, and billing.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Core Values Section */}
        <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10 sm:mb-12 md:mb-14">
              <p className="text-sky-600 tracking-[0.18em] text-xs sm:text-sm md:text-base font-semibold uppercase">
                Quality That Builds The Future.
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mt-3 sm:mt-4">Our Core Values</h2>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 md:gap-14 items-center">
              <div className="space-y-3 sm:space-y-4 md:space-y-5">
                {[
                  { no: "01", title: "Integrity", text: "Building trust through transparency and ethics." },
                  { no: "02", title: "Excellence", text: "Delivering beyond expectations." },
                  { no: "03", title: "Innovation", text: "Adopting modern technology for smarter solutions." },
                  { no: "04", title: "Sustainability", text: "Creating eco-friendly, future-ready infrastructure." },
                  { no: "05", title: "Commitment", text: "Dedication to client satisfaction and timely delivery." },
                ].map((item) => (
                  <div key={item.no} className="relative bg-[#e9ecf2] rounded-lg p-4 sm:p-5 md:p-6 pl-14 sm:pl-16 md:pl-20 shadow-sm">
                    <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-sky-600 text-white w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-md flex items-center justify-center text-sm sm:text-base md:text-lg font-semibold">
                      {item.no}
                    </div>
                    <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-900">{item.title}</h3>
                    <p className="text-slate-600 text-sm sm:text-base md:text-lg mt-1 sm:mt-2">- {item.text}</p>
                  </div>
                ))}
              </div>

              <div className="relative max-w-xl mx-auto w-full mt-6 lg:mt-0">
                <div className="absolute -top-6 sm:-top-8 right-0 w-[82%] h-[92%] border border-slate-300 rounded-[60px] sm:rounded-[90px]" />
                <div className="absolute -bottom-6 sm:-bottom-8 -left-4 sm:-left-6 w-[82%] h-[90%] bg-sky-600 rounded-[50px] sm:rounded-[70px]" />
                <img
                  src="https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80"
                  alt="Core values building"
                  className="relative w-full h-72 sm:h-96 md:h-[440px] lg:h-[500px] object-cover rounded-[50px] sm:rounded-[70px] shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

      </div>

      {role !== "CUSTOMER" && <GlobalFooter />}
    </div>
  );
};

export default HomePage;
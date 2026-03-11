import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { normalizeRole } from "../../utils/auth";
import { FaCubes, FaUserTie, FaTruckFast, FaHandshake } from "react-icons/fa6";
import GlobalFooter from "../../components/GlobalFooter";

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
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-end gap-6 text-sm font-medium text-gray-700">
            <Link to="/" className="text-indigo-600">
              Home
            </Link>
            <Link to="/about-us" className="hover:text-indigo-600 transition">
              About Us
            </Link>
            <Link to="/contact-us" className="hover:text-indigo-600 transition">
              Contact Us
            </Link>
            <Link to="/login" className="hover:text-indigo-600 transition">
              Login
            </Link>
            <Link to="/register" className="hover:text-indigo-600 transition">
              Register
            </Link>
          </div>
        </div>
      )}

      {/* Slider */}
      <div className="relative h-screen min-h-[70vh] overflow-hidden">

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
              <h1 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6">
                {slide.title}
              </h1>

              <p className="text-base md:text-lg mb-6 md:mb-8 max-w-xl">
                {slide.subtitle}
              </p>

              <Link
                to={role === "CUSTOMER" ? "/purchaseproduct" : "/login"}
                className="px-6 py-3 bg-indigo-600 rounded-lg hover:bg-indigo-500 transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        ))}

      </div>

      <div className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-blue-50 to-indigo-50">
        <div className="pointer-events-none absolute -top-16 -left-16 h-64 w-64 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -right-20 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 left-1/3 h-60 w-60 rounded-full bg-sky-200/40 blur-3xl" />

      <section className="py-12 md:py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 md:gap-10 items-start">
          <div>
            <img
              src="https://images.unsplash.com/photo-1599707254554-027aeb4deacd?auto=format&fit=crop&w=1400&q=80"
              alt="RMC Plant"
              className="w-full h-64 sm:h-80 lg:h-[460px] object-cover rounded-2xl shadow-lg"
            />
          </div>

          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">About RMC ERP</h2>
            <p className="text-slate-600 text-base md:text-lg leading-7 md:leading-8 mt-5 md:mt-6">
              RMC ERP is a powerful enterprise management system built specifically for
              Ready Mix Concrete industries. It streamlines order processing, production
              scheduling, dispatch tracking, and customer management.
            </p>
            <p className="text-slate-600 text-base md:text-lg leading-7 md:leading-8 mt-4 md:mt-5">
              Our smart automation tools help reduce delays, increase efficiency, and
              improve overall operational control across plants and delivery networks.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mt-6 md:mt-8">
              <div className="bg-white/90 backdrop-blur rounded-2xl p-5 text-center shadow transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">
                <h3 className="text-indigo-600 text-xl md:text-2xl font-semibold mb-3">Quality Control</h3>
                <p className="text-slate-600 text-base md:text-lg leading-7 md:leading-8">
                  Maintain consistent and high-grade concrete standards.
                </p>
              </div>

              <div className="bg-white/90 backdrop-blur rounded-2xl p-5 text-center shadow transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">
                <h3 className="text-indigo-600 text-xl md:text-2xl font-semibold mb-3">Fast Dispatch</h3>
                <p className="text-slate-600 text-base md:text-lg leading-7 md:leading-8">
                  Real-time delivery tracking and scheduling.
                </p>
              </div>

              <div className="bg-white/90 backdrop-blur rounded-2xl p-5 text-center shadow transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">
                <h3 className="text-indigo-600 text-xl md:text-2xl font-semibold mb-3">Smart Analytics</h3>
                <p className="text-slate-600 text-base md:text-lg leading-7 md:leading-8">
                  Data-driven insights for business growth.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <p className="text-blue-600 tracking-[0.18em] text-sm md:text-base font-semibold uppercase">
              Why Choose Us
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mt-4 md:mt-5">
              Building Trust, Delivering Excellence
            </h2>
            <p className="text-slate-600 max-w-4xl mx-auto mt-4 md:mt-6 text-base md:text-lg leading-8 md:leading-9">
              With years of expertise in infrastructure and roofing solutions, we deliver quality,
              innovation, and reliability in every project.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-7">
            {whyChooseItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="bg-white/90 backdrop-blur rounded-2xl p-7 md:p-10 text-center shadow transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl"
                >
                  <div className="w-20 h-20 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center">
                    <Icon className="text-3xl" />
                  </div>
                  <h3 className="text-xl md:text-2xl mt-6 md:mt-7 font-semibold text-slate-900">{item.title}</h3>
                  <p className="text-slate-600 mt-4 md:mt-5 text-base md:text-lg leading-7 md:leading-9">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      {/* ================= Services Section ================= */}
      <section className="py-14 md:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-10 md:mb-12">
            Our Services
          </h2>

          <div className="grid md:grid-cols-3 gap-5 md:gap-8">

            <div className="bg-white/90 backdrop-blur p-6 md:p-8 rounded-2xl shadow transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl">
              <h3 className="text-lg md:text-xl font-semibold text-indigo-600 mb-4">
                Concrete Supply
              </h3>
              <p className="text-gray-600 text-sm md:text-base">
                High-quality ready mix concrete for residential,
                commercial and industrial projects.
              </p>
            </div>

            <div className="bg-white/90 backdrop-blur p-6 md:p-8 rounded-2xl shadow transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl">
              <h3 className="text-lg md:text-xl font-semibold text-indigo-600 mb-4">
                Logistics Management
              </h3>
              <p className="text-gray-600 text-sm md:text-base">
                Smart scheduling and real-time tracking for
                efficient and timely deliveries.
              </p>
            </div>

            <div className="bg-white/90 backdrop-blur p-6 md:p-8 rounded-2xl shadow transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl">
              <h3 className="text-lg md:text-xl font-semibold text-indigo-600 mb-4">
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
      {/* ================================================= */}

      <section className="py-16 md:py-24 px-4 sm:px-6 bg-[#efefef]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-14">
            <p className="text-sky-600 tracking-[0.18em] text-sm md:text-base font-semibold uppercase">
              Quality That Builds The Future.
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-4">Our Core Values</h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 md:gap-14 items-center">
            <div className="space-y-4 md:space-y-5">
              {[
                { no: "01", title: "Integrity", text: "Building trust through transparency and ethics." },
                { no: "02", title: "Excellence", text: "Delivering beyond expectations." },
                { no: "03", title: "Innovation", text: "Adopting modern technology for smarter solutions." },
                { no: "04", title: "Sustainability", text: "Creating eco-friendly, future-ready infrastructure." },
                { no: "05", title: "Commitment", text: "Dedication to client satisfaction and timely delivery." },
              ].map((item) => (
                <div key={item.no} className="relative bg-[#e9ecf2] rounded-lg p-5 md:p-6 pl-16 md:pl-20 shadow-sm">
                  <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-sky-600 text-white w-12 h-12 md:w-14 md:h-14 rounded-md flex items-center justify-center text-lg font-semibold">
                    {item.no}
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold text-slate-900">{item.title}</h3>
                  <p className="text-slate-600 text-base md:text-lg mt-2">- {item.text}</p>
                </div>
              ))}
            </div>

            <div className="relative max-w-xl mx-auto w-full">
              <div className="absolute -top-8 right-0 w-[82%] h-[92%] border border-slate-300 rounded-[90px]" />
              <div className="absolute -bottom-8 -left-6 w-[82%] h-[90%] bg-sky-600 rounded-[70px]" />
              <img
                src="https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80"
                alt="Core values building"
                className="relative w-full h-[500px] object-cover rounded-[70px] shadow-2xl"
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



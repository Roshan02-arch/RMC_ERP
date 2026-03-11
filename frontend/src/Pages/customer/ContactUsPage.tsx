import { Link } from "react-router-dom";
import { normalizeRole } from "../../utils/auth";
import UserNavbar from "../../components/UserNavbar";
import { FaEnvelope, FaLocationDot, FaPhoneVolume } from "react-icons/fa6";
import GlobalFooter from "../../components/GlobalFooter";

const ContactUsPage = () => {
  const role = normalizeRole(localStorage.getItem("role"));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50 to-indigo-50">
      {role === "CUSTOMER" ? (
        <UserNavbar />
      ) : (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-end gap-6 text-sm font-medium text-gray-700">
            <Link to="/" className="hover:text-indigo-600 transition">
              Home
            </Link>
            <Link to="/about-us" className="hover:text-indigo-600 transition">
              About Us
            </Link>
            <Link to="/contact-us" className="text-indigo-600">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <section className="relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur shadow-xl border border-blue-100 p-6 md:p-10">
          <div className="absolute -top-16 -left-16 h-44 w-44 rounded-full bg-blue-200/40 blur-3xl animate-pulse" />
          <div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-indigo-200/40 blur-3xl animate-pulse" />

          <div className="relative grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-blue-200 bg-white px-4 py-2 shadow-sm">
                <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  RMC
                </div>
                <span className="text-sm font-semibold text-slate-700">RMC ERP Contact Desk</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-5">Contact Us</h1>
              <p className="text-slate-600 text-base md:text-lg mt-4 leading-8">
                We are here to help you with orders, dispatch, and support. Reach us through
                the details below.
              </p>

              <div className="mt-7 space-y-4">
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-200 p-4 transition hover:shadow-md">
                  <FaLocationDot className="text-blue-600 text-lg mt-1 shrink-0" />
                  <div>
                    <p className="text-sm uppercase tracking-wide text-slate-500">Address</p>
                    <p className="text-slate-800 font-medium">123 RMC Industrial Park, Pune, Maharashtra 411001</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-200 p-4 transition hover:shadow-md">
                  <FaPhoneVolume className="text-blue-600 text-lg mt-1 shrink-0" />
                  <div>
                    <p className="text-sm uppercase tracking-wide text-slate-500">Phone</p>
                    <p className="text-slate-800 font-medium">+91 98765 43210</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-200 p-4 transition hover:shadow-md">
                  <FaEnvelope className="text-blue-600 text-lg mt-1 shrink-0" />
                  <div>
                    <p className="text-sm uppercase tracking-wide text-slate-500">Email</p>
                    <p className="text-slate-800 font-medium">support@rmcerp-demo.com</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 shadow-md p-5 md:p-6 transition hover:shadow-xl">
              <h2 className="text-xl md:text-2xl font-semibold text-slate-900">Send a Message</h2>
              <p className="text-slate-500 text-sm mt-1">Demo form with dummy data.</p>

              <div className="mt-5 space-y-3">
                <input
                  type="text"
                  placeholder="Your Name"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <input
                  type="email"
                  placeholder="Your Email"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <textarea
                  rows={5}
                  placeholder="Write your message..."
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  type="button"
                  className="w-full rounded-lg bg-orange-500 hover:bg-orange-600 text-white py-3 font-semibold transition transform hover:scale-[1.02]"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <GlobalFooter />
    </div>
  );
};

export default ContactUsPage;

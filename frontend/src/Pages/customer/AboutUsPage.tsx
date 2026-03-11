import { useState } from "react";
import { Link } from "react-router-dom";
import { normalizeRole } from "../../utils/auth";
import { FaCircleCheck } from "react-icons/fa6";
import UserNavbar from "../../components/UserNavbar";
import GlobalFooter from "../../components/GlobalFooter";

const AboutUsPage = () => {
  const [showMore, setShowMore] = useState(false);
  const role = normalizeRole(localStorage.getItem("role"));

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      {role === "CUSTOMER" ? (
        <UserNavbar />
      ) : (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-end gap-6 text-sm font-medium text-gray-700">
            <Link to="/" className="hover:text-indigo-600 transition">
              Home
            </Link>
            <Link to="/about-us" className="text-indigo-600">
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

      <section className="pt-28 pb-16 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-blue-600 tracking-[0.18em] text-sm font-semibold uppercase">About Us</p>
            <h1 className="text-4xl font-bold text-slate-900 mt-4">RRY Infra Pvt. Ltd.</h1>
            <p className="text-slate-700 mt-5 text-base leading-8">
              At RRY Infra Private Limited, we believe that strong foundations build stronger futures.
            </p>
            <p className="text-slate-700 mt-3 text-base leading-8">
              Established with a vision to deliver world-class infrastructure solutions, we are committed to
              excellence, reliability, and innovation in every project we undertake.
            </p>

            <div className="mt-6 space-y-3">
              {[
                "Strong Foundations for a Stronger Future",
                "Designing with Innovation, Building with Trust",
                "Sustainable Infrastructure for Generations Ahead",
                "Reliable Materials, Reliable Partnerships",
                "Engineering Excellence in Every Project",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <FaCircleCheck className="text-sky-600 mt-1 text-base shrink-0" />
                  <p className="text-slate-900 text-lg">{item}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowMore(true)}
              className="mt-8 bg-sky-600 hover:bg-sky-700 text-white px-6 py-3 rounded-lg text-base font-semibold transition"
            >
              Read More
            </button>
          </div>

          <div className="relative max-w-xl mx-auto w-full">
            <div className="absolute -left-6 -top-6 w-full h-full bg-sky-600 rounded-md" />
            <img
              src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1200&q=80"
              alt="About RRY Infra"
              className="relative rounded-md shadow-2xl w-full h-[460px] object-cover"
            />
          </div>
        </div>
      </section>

      {showMore && (
        <section className="bg-[#efefef] py-14 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-[#233a8b] rounded-2xl shadow-lg p-8 text-white text-center">
                <div className="mx-auto w-16 h-16 rounded-xl bg-sky-500 flex items-center justify-center text-2xl font-bold">
                  V
                </div>
                <h3 className="text-3xl font-bold mt-5">Our Vision</h3>
                <p className="text-lg leading-8 mt-4 text-blue-50">
                  To be recognized as a trusted leader in infrastructure, delivering innovative,
                  sustainable, and reliable solutions that shape stronger communities and a brighter future.
                </p>
              </div>

              <div className="bg-[#233a8b] rounded-2xl shadow-lg p-8 text-white text-center">
                <div className="mx-auto w-16 h-16 rounded-xl bg-sky-500 flex items-center justify-center text-2xl font-bold">
                  M
                </div>
                <h3 className="text-3xl font-bold mt-5">Our Mission</h3>
                <p className="text-lg leading-8 mt-4 text-blue-50">
                  To provide world-class infrastructure services with integrity, excellence, and innovation,
                  ensuring customer satisfaction, timely delivery, and sustainable development in every project.
                </p>
              </div>
            </div>

            <div className="text-center mt-16">
              <p className="text-sky-600 tracking-[0.35em] uppercase font-semibold text-base">
                Our Infrastructure
              </p>
              <h3 className="text-5xl font-bold text-slate-900 mt-6">Highly Efficient Quality Lab</h3>
            </div>
          </div>
        </section>
      )}

      <section className="bg-[#efefef] py-14 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center text-4xl font-bold text-slate-900 mb-12">
            Highly Efficient Quality Lab
          </h2>

          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <div className="relative bg-[#e9ecf2] rounded-lg p-6 pl-16 shadow-sm">
                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-sky-600 text-white w-12 h-12 rounded-md flex items-center justify-center text-xl font-semibold">
                  01
                </div>
                <h3 className="text-2xl font-bold text-slate-900">RRY Infra Quality Lab</h3>
                <p className="text-slate-600 text-lg leading-9 mt-2">
                  RRY Infra&apos;s Quality Lab ensures top-quality RMC with advanced testing, skilled engineers,
                  and strict adherence to standards. From sampling to final inspection, it guarantees strength,
                  durability, and reliability for safe, cost-effective, and long-lasting construction.
                </p>
              </div>

              <div className="relative bg-[#e9ecf2] rounded-lg p-6 pl-16 shadow-sm">
                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-sky-600 text-white w-12 h-12 rounded-md flex items-center justify-center text-xl font-semibold">
                  02
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Batch Cabinet</h3>
                <p className="text-slate-600 text-lg leading-9 mt-2">
                  RRY Infra&apos;s Batch Cabin is the control hub of the RMC plant, equipped with advanced
                  computerized systems for precise proportioning of cement, aggregates, water, and admixtures.
                  Skilled operators monitor every stage of production, ensuring consistency, accuracy, and
                  uninterrupted supply of high-quality concrete.
                </p>
              </div>
            </div>

            <div className="relative max-w-xl mx-auto w-full">
              <div className="absolute -top-8 right-0 w-[82%] h-[92%] border border-slate-300 rounded-[90px]" />
              <div className="absolute -bottom-8 -left-6 w-[82%] h-[90%] bg-sky-600 rounded-[70px]" />
              <div className="relative bg-[#5f9ec8] p-4 rounded-[70px] shadow-2xl">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <img
                    src="https://images.unsplash.com/photo-1581093450021-4a7360e9a6b2?auto=format&fit=crop&w=900&q=80"
                    alt="Quality lab equipment"
                    className="col-span-2 h-44 w-full object-cover rounded"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1574359411659-15573d9f4f31?auto=format&fit=crop&w=500&q=80"
                    alt="Concrete test tank"
                    className="col-span-1 h-44 w-full object-cover rounded"
                  />
                </div>
                <img
                  src="https://images.unsplash.com/photo-1581090700227-1e8e8d3f3f0b?auto=format&fit=crop&w=1200&q=80"
                  alt="Batch cabin control room"
                  className="h-52 w-full object-cover rounded"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <GlobalFooter />
    </div>
  );
};

export default AboutUsPage;


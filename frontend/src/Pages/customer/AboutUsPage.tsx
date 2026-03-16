import { useState, useEffect, useRef, type SyntheticEvent } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { normalizeRole } from "../../utils/auth";
import { FaCircleCheck } from "react-icons/fa6";
import UserNavbar from "../../components/UserNavbar";
import GlobalFooter from "../../components/GlobalFooter";
import aboutImage from "../../images/about.jpg";

const AboutUsPage = () => {
  const navigate = useNavigate();
  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "text-indigo-300 border-b-2 border-indigo-300 pb-1"
      : "transition hover:text-indigo-300";

  const [showMore, setShowMore] = useState(false);
  const role = normalizeRole(localStorage.getItem("role"));

  const heroImgRef = useRef<HTMLDivElement>(null);
  const [heroInView, setHeroInView] = useState(false);

  const imgSectionRef = useRef<HTMLDivElement>(null);
  const [imgInView, setImgInView] = useState(false);

  useEffect(() => {
    const createObserver = (
      ref: React.RefObject<HTMLDivElement>,
      setter: (v: boolean) => void
    ) => {
      const el = ref.current;
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setter(true);
            observer.disconnect();
          }
        },
        { threshold: 0.2 }
      );
      observer.observe(el);
      return observer;
    };

    const o1 = createObserver(heroImgRef, setHeroInView);
    const o2 = createObserver(imgSectionRef, setImgInView);
    return () => {
      o1?.disconnect();
      o2?.disconnect();
    };
  }, []);

  const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = aboutImage;
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      {role === "CUSTOMER" ? (
        <UserNavbar />
      ) : (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-end gap-6 text-sm font-medium text-gray-700">
            <NavLink to="/" end className={navItemClass}>Home</NavLink>
            <NavLink to="/about-us" className={navItemClass}>About Us</NavLink>
            <NavLink to="/contact-us" className={navItemClass}>Contact Us</NavLink>
            <NavLink to="/login" className={navItemClass}>Login</NavLink>
            <NavLink to="/register" className={navItemClass}>Register</NavLink>
          </div>
        </div>
      )}

      {/* ── Hero / About Section ── */}
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

          {/* Animated hero image */}
          <div ref={heroImgRef} className="relative max-w-xl mx-auto w-full">
            <div
              className="absolute -left-6 -top-6 w-full h-full bg-sky-600 rounded-md"
              style={{
                opacity: heroInView ? 1 : 0,
                transform: heroInView ? "translate(0, 0)" : "translate(-20px, -20px)",
                transition: "opacity 0.55s ease 0.1s, transform 0.55s ease 0.1s",
              }}
            />
            <img
              src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1200&q=80"
              alt="About RRY Infra"
              onError={handleImageError}
              className="relative rounded-md shadow-2xl w-full h-[460px] object-cover"
              style={{
                opacity: heroInView ? 1 : 0,
                transform: heroInView ? "translateY(0)" : "translateY(36px)",
                transition: "opacity 0.65s ease 0.25s, transform 0.65s ease 0.25s",
              }}
            />
          </div>
        </div>
      </section>

      {/* ── Vision & Mission (inside Read More) ── */}
      {showMore && (
        <section className="bg-[#efefef] py-14 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {[
                {
                  letter: "V",
                  title: "Our Vision",
                  text: "To be recognized as a trusted leader in infrastructure, delivering innovative, sustainable, and reliable solutions that shape stronger communities and a brighter future.",
                },
                {
                  letter: "M",
                  title: "Our Mission",
                  text: "To provide world-class infrastructure services with integrity, excellence, and innovation, ensuring customer satisfaction, timely delivery, and sustainable development in every project.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="group bg-[#233a8b] rounded-2xl shadow-lg p-8 text-white text-center relative overflow-hidden
                    transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_24px_48px_rgba(35,58,139,0.4)]"
                >
                  <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-sky-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 scale-100 group-hover:scale-125 pointer-events-none" />
                  <div className="mx-auto w-16 h-16 rounded-xl bg-sky-500 flex items-center justify-center text-2xl font-bold
                    transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 shadow-lg shadow-sky-500/40">
                    {card.letter}
                  </div>
                  <h3 className="text-3xl font-bold mt-5">{card.title}</h3>
                  <div className="w-10 group-hover:w-16 h-0.5 bg-sky-400 mx-auto mt-3 mb-4 transition-all duration-300 rounded-full" />
                  <p className="text-lg leading-8 text-blue-100">{card.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── "Our Infrastructure" heading — ALWAYS VISIBLE, outside showMore ── */}
      <section className="bg-[#efefef] pt-14 pb-2 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sky-600 tracking-[0.35em] uppercase font-semibold text-base">
            Our Infrastructure
          </p>
          <h2 className="text-5xl font-bold text-slate-900 mt-4">
            Highly Efficient Quality Lab
          </h2>
        </div>
      </section>

      {/* ── Quality Lab Content ── */}
      <section className="bg-[#efefef] pt-6 pb-14 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 items-center">

            {/* Left: text cards */}
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

            {/* Right: animated image block */}
            <div ref={imgSectionRef} className="relative max-w-[620px] mx-auto w-full">
              <div
                className="absolute -top-9 right-2 w-[84%] h-[94%] border border-slate-300/90 rounded-tr-[100px] rounded-br-[100px]"
                style={{
                  opacity: imgInView ? 1 : 0,
                  transform: imgInView ? "translateX(0)" : "translateX(30px)",
                  transition: "opacity 0.6s ease 0.5s, transform 0.6s ease 0.5s",
                }}
              />
              <div
                className="absolute -bottom-9 -left-7 w-[84%] h-[90%] bg-sky-600 rounded-bl-[100px]"
                style={{
                  opacity: imgInView ? 1 : 0,
                  transform: imgInView ? "translateX(0)" : "translateX(-40px)",
                  transition: "opacity 0.55s ease 0.15s, transform 0.55s ease 0.15s",
                }}
              />
              <div
                className="relative bg-[#61a4d0] p-4 rounded-tr-[100px] rounded-bl-[100px] shadow-2xl overflow-hidden"
                style={{
                  opacity: imgInView ? 1 : 0,
                  transform: imgInView ? "translateY(0)" : "translateY(40px)",
                  transition: "opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s",
                }}
              >
                <div className="absolute left-3 top-[43%] w-7 h-7 rounded-full border-2 border-sky-500/90 bg-transparent" />
                <div className="grid grid-cols-[2fr_1fr] gap-3 mb-3">
                  <img
                    src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80"
                    alt="RMC quality lab setup"
                    onError={handleImageError}
                    className="h-40 w-full object-cover rounded-sm"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=500&q=80"
                    alt="Concrete testing pit"
                    onError={handleImageError}
                    className="h-40 w-full object-cover rounded-sm"
                  />
                </div>
                <img
                  src="https://images.unsplash.com/photo-1581092921461-7d65ca45f3d9?auto=format&fit=crop&w=1200&q=80"
                  alt="Batch control room operator"
                  onError={handleImageError}
                  className="h-44 w-full object-cover rounded-sm"
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
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ArrowLeft,
  Truck,
  ShieldCheck,
  Zap,
  ChevronRight,
  Route,
} from "lucide-react";
import aayshlogo2 from "../assets/aaysh_logo_2.png";
import { useEffect, useRef, useState } from "react";
import { loginUser } from "../api/authAPI";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { authVerify } from "../store/slice/checkAuth";
import { toast } from '../utils/toast';

const THEME_KEY = "aaysh-home-theme";

const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem(THEME_KEY) || "light";
  });

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return { theme, toggle, isDark: theme === "dark" };
};

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { toggle, isDark } = useTheme();
  const { isAuthenticated, loading } = useSelector((state) => state.auth);

  const emailRef = useRef();
  const passwordRef = useRef();
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = isDark
    ? {
        page: "bg-[#060b14] text-slate-100",
        panel: "bg-[#0a1120] border-white/10",
        heroGlow: "from-cyan-500/20 via-blue-600/10 to-transparent",
        heroGrid: "opacity-[0.07]",
        badge: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
        h1: "text-white",
        h1Accent: "text-cyan-400",
        sub: "text-slate-400",
        card: "bg-white/[0.04] border-white/10 backdrop-blur-xl",
        label: "text-slate-300",
        input: "bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20",
        inputIcon: "text-slate-500",
        btnPrimary: "bg-cyan-500 hover:bg-cyan-400 text-[#060b14]",
        btnSecondary: "bg-white/10 hover:bg-white/15 text-white border border-white/10",
        link: "text-cyan-400 hover:text-cyan-300",
        error: "bg-rose-500/10 text-rose-300 border-rose-500/20",
        featureCard: "bg-white/[0.04] border-white/10",
        featureIcon: "bg-cyan-500/15 text-cyan-400",
        footer: "text-slate-500",
        imageOverlay: "from-[#060b14]/90 via-[#060b14]/40 to-transparent",
      }
    : {
        page: "bg-[#f4f7fb] text-slate-800",
        panel: "bg-white border-slate-200/80",
        heroGlow: "from-cyan-100/80 via-blue-50/50 to-transparent",
        heroGrid: "opacity-[0.35]",
        badge: "bg-cyan-50 text-cyan-700 border-cyan-200/60",
        h1: "text-[#1B2B4B]",
        h1Accent: "text-cyan-600",
        sub: "text-slate-500",
        card: "bg-white border-slate-200/80 shadow-xl shadow-slate-200/50",
        label: "text-slate-700",
        input: "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20",
        inputIcon: "text-slate-400",
        btnPrimary: "bg-[#1B2B4B] hover:bg-[#152238] text-white",
        btnSecondary: "bg-white hover:bg-slate-50 text-[#1B2B4B] border border-slate-200",
        link: "text-cyan-600 hover:text-cyan-700",
        error: "bg-rose-50 text-rose-700 border-rose-200",
        featureCard: "bg-slate-50 border-slate-200/80",
        featureIcon: "bg-[#1B2B4B] text-white",
        footer: "text-slate-400",
        imageOverlay: "from-[#1B2B4B]/85 via-[#1B2B4B]/30 to-transparent",
      };

  const highlights = [
    { icon: Truck, text: "Real-time shipment tracking" },
    { icon: Route, text: "AWB & manifest management" },
    { icon: ShieldCheck, text: "Enterprise-grade security" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    const userCred = {
      email: emailRef.current.value,
      password: passwordRef.current.value,
    };

    try {
      setErrorMsg("");
      setIsSubmitting(true);
      await loginUser(userCred);
      await dispatch(authVerify());
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const fallbackMsg = error.message || "Login failed";
      setErrorMsg(fallbackMsg);
      toast.error(fallbackMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div
      className={`min-h-screen font-sans antialiased transition-colors duration-500 ${t.page}`}
    >
      {/* Top bar */}
      <header className="absolute top-0 left-0 right-0 z-20 px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("/")}
          className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${t.sub} hover:opacity-80`}
        >
          <ArrowLeft size={16} />
          Back to home
        </button>

        <button
          type="button"
          onClick={toggle}
          aria-label="Toggle theme"
          className={`p-2.5 rounded-xl transition-all ${t.btnSecondary}`}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left — Brand panel */}
        <div className="relative lg:w-[52%] flex flex-col justify-center px-6 sm:px-10 lg:px-16 pt-20 pb-10 lg:py-16 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80"
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover hidden lg:block"
          />
          <div
            className={`absolute inset-0 hidden lg:block bg-gradient-to-br ${t.imageOverlay}`}
          />
          <div
            className={`absolute inset-0 bg-gradient-to-br ${t.heroGlow} pointer-events-none`}
          />
          <div
            className={`absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:24px_24px] ${t.heroGrid} pointer-events-none`}
            style={{ color: isDark ? "#fff" : "#1B2B4B" }}
          />
          <div className="absolute top-1/4 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-lg mx-auto lg:mx-0">
            <Link
              to="/"
              className="flex items-center gap-3 mb-8 hover:opacity-90 transition-opacity"
            >
              <img
                src={aayshlogo2}
                alt="Aaysh Express"
                className="h-11 w-auto object-contain"
              />
              <span className={`text-xl font-bold tracking-tight ${t.h1}`}>
                AAYSH<span className="text-cyan-500">EXPRESS</span>
              </span>
            </Link>

            <span
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border mb-6 ${t.badge}`}
            >
              <Zap size={14} />
              Client Portal
            </span>

            <h1
              className={`text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold leading-tight tracking-tight mb-5 ${t.h1}`}
            >
              Welcome back to your{" "}
              <span className={t.h1Accent}>logistics hub</span>
            </h1>

            <p className={`text-base sm:text-lg leading-relaxed mb-10 ${t.sub}`}>
              Sign in to manage shipments, assign AWBs, schedule pickups, and
              track deliveries — all from one unified workspace.
            </p>

            <div className="space-y-3 hidden sm:block">
              {highlights.map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${t.featureCard}`}
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 ${t.featureIcon}`}
                  >
                    <Icon size={16} />
                  </div>
                  <span className={`text-sm font-medium ${t.sub}`}>{text}</span>
                </div>
              ))}
            </div>

            {/* Mobile hero image strip */}
            <div className="sm:hidden relative mt-8 h-44 rounded-2xl overflow-hidden border border-white/10">
              <img
                src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80"
                alt="Logistics warehouse"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                className={`absolute inset-0 bg-gradient-to-t ${t.imageOverlay}`}
              />
            </div>
          </div>
        </div>

        {/* Right — Form panel */}
        <div
          className={`lg:w-[48%] flex items-center justify-center px-6 sm:px-10 lg:px-16 py-12 lg:py-16 border-t lg:border-t-0 lg:border-l transition-colors duration-500 ${t.panel}`}
        >
          <div className="w-full max-w-md">
            <div className={`rounded-2xl border p-8 sm:p-10 ${t.card}`}>
              <div className="mb-8">
                <h2 className={`text-2xl font-bold tracking-tight ${t.h1}`}>
                  Sign in
                </h2>
                <p className={`mt-2 text-sm ${t.sub}`}>
                  Enter your credentials to access the dashboard
                </p>
              </div>

              {errorMsg && (
                <div
                  className={`mb-6 px-4 py-3 rounded-xl border text-sm font-medium ${t.error}`}
                  role="alert"
                >
                  {errorMsg}
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label
                    htmlFor="email"
                    className={`block text-sm font-semibold mb-2 ${t.label}`}
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail
                      className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 ${t.inputIcon}`}
                    />
                    <input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 transition-all ${t.input}`}
                      ref={emailRef}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label
                      htmlFor="password"
                      className={`block text-sm font-semibold ${t.label}`}
                    >
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className={`text-xs font-semibold transition-colors ${t.link}`}
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock
                      className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 ${t.inputIcon}`}
                    />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className={`w-full pl-11 pr-11 py-3 rounded-xl border text-sm outline-none focus:ring-2 transition-all ${t.input} [&::-ms-reveal]:hidden`}
                      ref={passwordRef}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors ${t.inputIcon} hover:opacity-70`}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <Eye className="w-5 h-5" />
                      ) : (
                        <EyeOff className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${t.btnPrimary}`}
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign in to dashboard
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className={`mt-8 text-center text-xs ${t.footer}`}>
              © 2026{" "}
              <span className={`font-semibold ${t.h1}`}>AAYSHEXPRESS</span> —
              All rights reserved
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;

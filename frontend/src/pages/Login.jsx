import { Mail, Lock, EyeOff } from "lucide-react";
import aayshlogo from "../assets/aaysh_logo.png";
import { useRef, useState } from "react";
import { loginUser } from "../api/authAPI";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { authVerify } from '../store/slice/checkAuth';

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const emailRef = useRef();
  const passwordRef = useRef();
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const userCred = {
      email: emailRef.current.value,
      password: passwordRef.current.value,
    };

    try {
      setErrorMsg(""); // clear previous error
      await loginUser(userCred);
      await dispatch(authVerify());
      navigate("/dashboard");
    } catch (error) {
      setErrorMsg(error.message || "Login failed");
    }
  };

  return (
    <div className="flex flex-col-reverse lg:flex-row h-screen overflow-hidden bg-white font-sans">
      {/* Left Side: Hero Image Section */}
      <div className="lg:flex w-full mx-auto lg:w-1/2 p-6 h-full">
        <div className="relative w-full h-full rounded-[40px] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80"
            alt="Warehouse"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Overlay gradient for text readability */}
          <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-12 text-white">
            <p className="uppercase tracking-widest text-sm font-semibold mb-2">
              Smart Tracking Technology
            </p>
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              Complete Visibility Always
            </h1>
            <p className="text-lg opacity-90 max-w-md mb-8">
              Track your shipments in real-time from origin to destination.
              Ensure your cargo is safe and arrives exactly on time with live
              monitoring.
            </p>
            {/* Progress indicators */}
            <div className="flex gap-2">
              <div className="h-1 w-16 bg-white/30 rounded-full"></div>
              <div className="h-1 w-16 bg-white rounded-full"></div>
              <div className="h-1 w-16 bg-white/30 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Form Section */}
      <div className="w-full lg:w-1/2 h-full overflow-y-auto flex flex-col p-8 lg:p-16">
        <div className="self-end mb-8 text-gray-600 text-sm">
          Don't have an account?{" "}
          <span className="text-blue-900 font-bold cursor-pointer">
            Sign Up
          </span>
        </div>

        <div className="max-w-xl w-full mx-auto">
          {/* Logo Section */}
          <div className="text-center mb-10">
            <img
              src={aayshlogo}
              alt="aaysh-logo"
              className="mx-auto w-full h-24"
            />
          </div>

          {errorMsg && (
            <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm font-medium">
              {errorMsg}
            </p>
          )}

          <form className="flex flex-col gap-y-6" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label className="block text-[15px] font-bold text-gray-700 uppercase mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 w-5 h-5" />
                <input
                  type="email"
                  placeholder="john@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  ref={emailRef}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[15px] font-bold text-gray-700 uppercase mb-2">
                Password{" "}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 w-5 h-5" />
                <input
                  type="password"
                  placeholder="............"
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  ref={passwordRef}
                  required
                />
                <EyeOff className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 cursor-pointer" />
              </div>
            </div>
            <button className="w-full px-10 py-3 border rounded-xl bg-[#0f203b] text-white font-bold hover:bg-[#0d1a2e] hover:scale-99 transition-transform duration-200 cursor-pointer">
              Log in
            </button>
          </form>

          <p className="hidden lg:block mt-15 text-center text-gray-600 text-lg">
            Copyright © 2026{" "}
            <span className="font-bold text-black">Softieons</span> – All Rights
            Reserved
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

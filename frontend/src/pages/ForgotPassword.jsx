import { Mail, ArrowLeft } from "lucide-react";
import aayshlogo from "../assets/aaysh_logo.png";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordAPI } from "../api/authAPI";
import { toast } from "react-hot-toast"; // Imported for crisp toast notifications

const ForgotPassword = () => {
  const emailRef = useRef();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      await forgotPasswordAPI(
        emailRef.current.value
      );

      toast.success("If an account exists for this email, you will receive password reset instructions.");

    } catch (error) {
      toast.error(error.message || "Something went wrong.");

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col-reverse lg:flex-row h-screen overflow-hidden bg-white font-sans">
      {/* Left Side: Hero Image (Consistent with Login) */}
      <div className="hidden lg:flex w-full lg:w-1/2 p-6 h-full">
        <div className="relative w-full h-full rounded-[40px] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80"
            alt="Warehouse"
            className="absolute inset-0 w-full h-full object-cover"
          />

          <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-12 text-white">
            <h1 className="text-5xl font-bold mb-6">
              Security First.
            </h1>

            <p className="text-lg opacity-90 max-w-md">
              Recover your access securely and get back to managing your logistics in just a few steps.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full lg:w-1/2 h-full flex flex-col justify-center p-8 lg:p-16">
        <div className="max-w-md w-full mx-auto">

          <div className="text-center mb-8">
            <img
              src={aayshlogo}
              alt="logo"
              className="mx-auto w-45 h-36"
            />

            <h2 className="text-2xl font-bold text-gray-800 mt-4">
              Forgot Password?
            </h2>

            <p className="text-gray-500 mt-2">
              Enter your email to reset your password.
            </p>
          </div>

          <form
            className="flex flex-col gap-y-6"
            onSubmit={handleSubmit}
          >

            <div>
              <label className="block text-[15px] font-bold text-gray-700 uppercase mb-2">
                Email Address
              </label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 w-5 h-5" />

                <input
                  type="email"
                  ref={emailRef}
                  placeholder="john@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full px-10 py-3 rounded-xl bg-[#0f203b] text-white font-bold hover:bg-[#0d1a2e] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Sending..."
                : "Send Reset Link"}
            </button>
          </form>

          <Link
            to="/login"
            className="flex items-center justify-center mt-8 text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link>

        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
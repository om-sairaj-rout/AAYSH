import { Lock, CheckCircle } from "lucide-react";
import aayshlogo from "../assets/aaysh_logo.png";
import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { resetPasswordAPI } from "../api/authAPI";
import { toast } from "react-hot-toast";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams();

  const newPasswordRef = useRef();
  const confirmPasswordRef = useRef();

  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      newPasswordRef.current.value !==
      confirmPasswordRef.current.value
    ) {
      setErrorMsg("Passwords do not match");
      toast.error("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");

      await resetPasswordAPI(
        token,
        newPasswordRef.current.value
      );

      setIsSuccess(true);
      toast.success("Password reset successful!");

      setTimeout(() => {
        navigate("/login");
      }, 3000);

    } catch (error) {
      const fallbackMsg = error.message || "Failed to reset password";
      setErrorMsg(fallbackMsg);
      toast.error(fallbackMsg);

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">

      <div className="max-w-md w-full bg-white p-8 lg:p-12 rounded-4xl shadow-sm border border-gray-100">

        {/* Logo Section */}
        <div className="text-center mb-8">
          <img
            src={aayshlogo}
            alt="logo"
            className="mx-auto w-40 h-auto"
          />

          <h2 className="text-2xl font-bold text-gray-800 mt-6">
            Set New Password
          </h2>

          <p className="text-gray-500 text-sm mt-2">
            Please enter your new password below to secure your account.
          </p>
        </div>

        {isSuccess ? (
          <div className="text-center p-8 bg-green-50 rounded-2xl border border-green-100">

            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />

            <h3 className="text-lg font-bold text-green-900">
              Success!
            </h3>

            <p className="text-green-700 text-sm">
              Password has been reset. Redirecting to login...
            </p>

          </div>
        ) : (

          <form
            className="flex flex-col gap-y-5"
            onSubmit={handleSubmit}
          >

            {errorMsg && (
              <p className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100">
                {errorMsg}
              </p>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                New Password
              </label>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />

                <input
                  type="password"
                  ref={newPasswordRef}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                Confirm Password
              </label>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />

                <input
                  type="password"
                  ref={confirmPasswordRef}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full mt-2 px-10 py-4 rounded-2xl bg-[#0f203b] text-white font-bold hover:bg-[#1a2e4d] hover:shadow-lg active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Updating..."
                : "Update Password"}
            </button>

          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
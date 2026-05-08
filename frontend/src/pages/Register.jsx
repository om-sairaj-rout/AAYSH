import {
  Building2,
  User,
  Phone,
  Mail,
  Lock,
  EyeOff,
  Users,
  MapPin, MapPinned,Map, Globe
} from "lucide-react";
import aayshlogo from "../assets/aaysh_logo.png";
import { useRef, useState } from "react";
import {useNavigate} from "react-router-dom";
import { registerUser } from "../api/authAPI";

const Register = () => {
  const navigate = useNavigate();

  const usernameRef = useRef();
  const emailRef = useRef();
  const passwordRef = useRef();
  const mobileRef = useRef();
  const companyRef = useRef();
  const genderRef = useRef();
  const addressRef = useRef();
  const zipCodeRef = useRef();
  const cityRef = useRef();
  const stateRef = useRef();
  const countryRef = useRef();

  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();

    const username = usernameRef.current.value.trim();
    const email = emailRef.current.value.trim();
    const password = passwordRef.current.value.trim();
    const mobile = mobileRef.current.value.trim();
    const company = companyRef.current.value.trim();
    const gender = genderRef.current.value.trim();
    const address = addressRef.current.value.trim();
    const zipCode = zipCodeRef.current.value.trim();
    const city = cityRef.current.value.trim();
    const state = stateRef.current.value.trim();
    const country = countryRef.current.value.trim();

    const newErrors = {};

    if (username.length < 3) {
      newErrors.username = "Username must contain at least 3 letters";
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Invalid email address"; // Changed for better clarity
    }
    if (password.length < 6) {
      newErrors.password = "Password must contain at least 6 characters"; // Changed for better clarity
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({}); // Clear validation errors before API call

    try {
      await registerUser({ username, email, password, mobile_number: mobile, company_name: company, gender, address, zip_code: zipCode, city, state, country });
      navigate("/login");
    } catch (error) {
      setErrors({ api: error.message || "Registration failed. Please try again." });
    }
  };


  return (
    <div className="w-full h-full overflow-y-auto flex flex-col p-8">
        <div className="max-w-xl w-full mx-auto">

          <form className="grid grid-cols-4 gap-x-4 gap-y-6 pb-12" onSubmit={handleSubmit}>
            {/* Row 1 */}
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Company Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="text" placeholder="Softieons Technolo" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                ref={companyRef}
                required
                />
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Full Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="text" placeholder="John Doe" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500" ref={usernameRef} required />
              </div>
                {errors.username && (
              <p className="text-red-500 text-sm mt-1">{errors.username}</p>
            )}
            </div>

            {/* Row 2 */}
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Mobile Number <span className="text-red-500">*</span></label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="text" placeholder="9876543210" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                ref={mobileRef}
                required
                />
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Email Address <span className="text-red-500">*</span></label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="email" placeholder="john@example.com" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                ref={emailRef}
                required />
              </div>
                {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
            </div>

            {/* Row 3 */}
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="password" placeholder="............" className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500" ref={passwordRef} required />
                <EyeOff className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 cursor-pointer" />
              </div>
                {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Gender <span className="text-red-500">*</span></label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100/50 appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-500" ref={genderRef} required >
                  <option>others</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
            </div>

            {/* Row 4: Full Width Address */}
            <div className="col-span-4">
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Address <span className="text-red-500">*</span></label>
              <div className="relative">
                <MapPin className="absolute left-3 top-4 text-gray-400 w-5 h-5" />
                <textarea placeholder="Enter your full address" rows="3" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" ref={addressRef} required></textarea>
              </div>
            </div>

            {/* Row 5: NEW GEOGRAPHIC FIELDS from image_f0a096.png */}
            <div className="col-span-1">
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Zip Code <span className="text-red-500">*</span></label>
              <div className="relative">
                <MapPinned className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="text" placeholder="Zip Code" className="w-full pl-10 pr-2 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm" ref={zipCodeRef} required />
              </div>
            </div>

            <div className="col-span-1">
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">City <span className="text-red-500">*</span></label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="text" placeholder="City" className="w-full pl-10 pr-2 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm" ref={cityRef} required />
              </div>
            </div>

            <div className="col-span-1">
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">State <span className="text-red-500">*</span></label>
              <div className="relative">
                <Map className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="text" placeholder="State" className="w-full pl-10 pr-2 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm" ref={stateRef} required />
              </div>
            </div>

            <div className="col-span-1">
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Country <span className="text-red-500">*</span></label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="text" placeholder="Country" className="w-full pl-10 pr-2 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm" ref={countryRef} required />
              </div>
            </div>

            {/* Submit Button */}
            <div className="col-span-4 mt-2">
              <button className="py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md uppercase tracking-wide text-sm cursor-pointer w-full bg-[#FF6B35] hover:bg-[#e85a2a]">
                Create Account
              </button>
            </div>
          </form>
          
        </div>
      </div>
  );
};

export default Register;
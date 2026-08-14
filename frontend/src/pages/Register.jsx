import {
  Building2,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  MapPinned,
  Map,
  Globe,
  Scale,
  ShieldAlert,
  FileText
} from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../api/authAPI";
import { toast } from "react-hot-toast";

const Register = () => {
  const navigate = useNavigate();

  const emailRef = useRef();
  const passwordRef = useRef();
  const mobileRef = useRef();
  const companyRef = useRef();
  const websiteRef = useRef();
  const gstinRef = useRef();
  const roleRef = useRef(); 
  const addressRef = useRef();
  const zipCodeRef = useRef();
  const cityRef = useRef();
  const stateRef = useRef();
  const countryRef = useRef();

  const [errors, setErrors] = useState({});
  const [showWeight, setShowWeight] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const email = emailRef.current.value.trim();
    const password = passwordRef.current.value.trim();
    const mobile = mobileRef.current.value.trim();
    const company = companyRef.current.value.trim();
    const website = websiteRef.current.value.trim();
    const gstin = gstinRef.current.value.trim();
    const role = roleRef.current.value; // Captured role value
    const address = addressRef.current.value.trim();
    const zipCode = zipCodeRef.current.value.trim();
    const city = cityRef.current.value.trim();
    const state = stateRef.current.value.trim();
    const country = countryRef.current.value.trim();

    const newErrors = {};

    if (company.length < 3) {
      newErrors.company = "Company name must contain at least 3 letters";
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Invalid email address"; 
    }
    if (password.length < 6) {
      newErrors.password = "Password must contain at least 6 characters"; 
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({}); 

    try {
      await registerUser({ 
        companyName: company, 
        email, 
        password, 
        mobile_number: mobile,
        role, 
        address, 
        zip_code: zipCode, 
        city, 
        state, 
        country,
        website,
        gstin,
        showWeight 
      });
      toast.success("Registration successful!");
      navigate("/login");
    } catch (error) {
      const errorMsg = error.message || "Registration failed. Please try again.";
      setErrors({ api: errorMsg });
      toast.error(errorMsg);
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
            {errors.company && (
              <p className="text-red-500 text-sm mt-1">{errors.company}</p>
            )}
          </div>

          {/* Website Field */}
          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Website</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" placeholder="https://example.com" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                ref={websiteRef}
              />
            </div>
          </div>

          {/* GSTIN Field */}
          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">GSTIN</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" placeholder="22AAAAA0000A1Z5" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                ref={gstinRef}
              />
            </div>
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
              <input type="email" placeholder="xyz@example.com" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="............" 
                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500 [&::-ms-reveal]:hidden" 
                ref={passwordRef} 
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <Eye className="w-5 h-5" />
                ) : (
                  <EyeOff className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          {/* ================= NEW ROLE SELECTION FIELD ================= */}
          <div className="col-span-4">
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Role <span className="text-red-500">*</span></label>
            <div className="relative">
              <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select 
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100/50 appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700" 
                ref={roleRef} 
                defaultValue="user"
                required 
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
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

          {/* Row 5: GEOGRAPHIC FIELDS */}
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

          {/* ================= OPTIMIZED COMPACT CHECKBOX LAYER ================= */}
          <div className="col-span-4">
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
              Show Weight Permission <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center h-11.5 border border-gray-200 rounded-xl bg-gray-100/50 px-3">
              <Scale className="text-gray-400 w-5 h-5 mr-2 shrink-0" />
              <span className="text-gray-500 text-sm flex-1 font-medium select-none">
                {showWeight ? "Enabled" : "Disabled"}
              </span>
              <input 
                type="checkbox" 
                checked={showWeight}
                onChange={(e) => setShowWeight(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="col-span-4 mt-2">
            <button className="py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md uppercase tracking-wide text-sm cursor-pointer w-full bg-[#FF6B35] hover:bg-[#e85a2a]">
              Create Account
            </button>
          </div>
          
          {/* Central API Error Messaging */}
          {errors.api && (
            <div className="col-span-4 text-center bg-red-50 border border-red-100 p-3 rounded-xl text-red-600 font-medium text-xs">
              {errors.api}
            </div>
          )}
        </form>
        
      </div>
    </div>
  );
};

export default Register;
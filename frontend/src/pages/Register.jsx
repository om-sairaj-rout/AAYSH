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
  FileText,
  UserCircle,
  Briefcase,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../api/authAPI";
import { toast } from "react-hot-toast";

const inputClass =
  "w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50/80 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition";

const labelClass =
  "block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1.5";

const FormSection = ({ icon: Icon, title, subtitle, accent, children }) => (
  <section
    className={`rounded-2xl border shadow-sm overflow-hidden ${accent.border} ${accent.bg}`}
  >
    <div className={`px-5 sm:px-6 py-4 border-b ${accent.headerBorder} ${accent.headerBg}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl shrink-0 ${accent.iconWrap}`}>
          <Icon className={`w-5 h-5 ${accent.iconColor}`} />
        </div>
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            {title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{subtitle}</p>
        </div>
      </div>
    </div>
    <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5 bg-white">
      {children}
    </div>
  </section>
);

const Field = ({ label, required, error, className = "", children }) => (
  <div className={className}>
    <label className={labelClass}>
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && <p className="text-red-500 text-xs mt-1.5 font-medium">{error}</p>}
  </div>
);

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    mobile: "",
    email: "",
    password: "",
    role: "user",
    companyName: "",
    website: "",
    gstin: "",
    address: "",
    zipCode: "",
    city: "",
    state: "",
    country: "",
  });

  const [errors, setErrors] = useState({});
  const [showWeight, setShowWeight] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};

    if (!formData.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    }
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }
    if (formData.password.length < 6) {
      newErrors.password = "Password must contain at least 6 characters";
    }
    if (formData.companyName.trim().length < 3) {
      newErrors.companyName = "Company name must contain at least 3 letters";
    }
    if (!formData.address.trim()) {
      newErrors.address = "Company address is required";
    }
    if (!formData.zipCode.trim()) {
      newErrors.zipCode = "Zip code is required";
    }
    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }
    if (!formData.state.trim()) {
      newErrors.state = "State is required";
    }
    if (!formData.country.trim()) {
      newErrors.country = "Country is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fix the highlighted fields");
      return;
    }

    setErrors({});

    try {
      const response = await registerUser({
        fullName: formData.fullName.trim(),
        companyName: formData.companyName.trim(),
        email: formData.email.trim(),
        password: formData.password.trim(),
        mobile_number: formData.mobile.trim(),
        role: formData.role,
        address: formData.address.trim(),
        zip_code: formData.zipCode.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        country: formData.country.trim(),
        website: formData.website.trim(),
        gstin: formData.gstin.trim(),
        showWeight,
      });
      toast.success(
        response.companyID
          ? `Registration successful! Company ID: ${response.companyID}`
          : "Registration successful!"
      );
      navigate("/login");
    } catch (error) {
      const errorMsg = error.message || "Registration failed. Please try again.";
      setErrors({ api: errorMsg });
      toast.error(errorMsg);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto flex flex-col p-6 sm:p-8">
      <div className="max-w-4xl w-full mx-auto space-y-6 pb-12">
        <div className="text-center sm:text-left">
          <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600">
            New Account Setup
          </p>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Create User Account
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">
            Register the customer login credentials first, then add the company
            profile and business details below.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* ================= CUSTOMER REGISTRATION ================= */}
          <FormSection
            icon={UserCircle}
            title="Customer Registration"
            subtitle="Personal login credentials and account access for the user"
            accent={{
              border: "border-indigo-100",
              bg: "bg-indigo-50/30",
              headerBg: "bg-indigo-50/60",
              headerBorder: "border-indigo-100",
              iconWrap: "bg-indigo-100",
              iconColor: "text-indigo-600",
            }}
          >
            <Field label="Full Name" required error={errors.fullName}>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Customer full name"
                  autoComplete="name"
                  className={inputClass}
                  required
                />
              </div>
            </Field>

            <Field label="Mobile Number" required error={errors.mobile}>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="9876543210"
                  className={inputClass}
                  required
                />
              </div>
            </Field>

            <Field label="Email Address" required error={errors.email}>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="customer@example.com"
                  className={inputClass}
                  required
                />
              </div>
            </Field>

            <Field label="Password" required error={errors.password}>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
                  className={`${inputClass} pr-10 [&::-ms-reveal]:hidden`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>
            </Field>

            <Field label="Role" required>
              <div className="relative">
                <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className={`${inputClass} appearance-none cursor-pointer`}
                  required
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </Field>
          </FormSection>

          {/* ================= COMPANY REGISTRATION ================= */}
          <FormSection
            icon={Briefcase}
            title="Company Registration"
            subtitle="Business identity, tax details, and registered company address. A unique Company ID is assigned automatically."
            accent={{
              border: "border-orange-100",
              bg: "bg-orange-50/20",
              headerBg: "bg-orange-50/50",
              headerBorder: "border-orange-100",
              iconWrap: "bg-orange-100",
              iconColor: "text-orange-600",
            }}
          >
            <Field label="Company Name" required error={errors.companyName}>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Your company name"
                  className={inputClass}
                  required
                />
              </div>
            </Field>

            <Field label="Website">
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://example.com"
                  className={inputClass}
                />
              </div>
            </Field>

            <Field label="GSTIN" className="md:col-span-2">
              <div className="relative md:max-w-md">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  name="gstin"
                  value={formData.gstin}
                  onChange={handleChange}
                  placeholder="22AAAAA0000A1Z5"
                  className={inputClass}
                />
              </div>
            </Field>

            <Field label="Company Address" required error={errors.address} className="md:col-span-2">
              <div className="relative">
                <MapPin className="absolute left-3 top-4 text-slate-400 w-5 h-5" />
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Registered business address"
                  rows="3"
                  className={`${inputClass} resize-none py-3`}
                  required
                />
              </div>
            </Field>

            <Field label="Zip Code" required error={errors.zipCode}>
              <div className="relative">
                <MapPinned className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  placeholder="Zip Code"
                  className={inputClass}
                  required
                />
              </div>
            </Field>

            <Field label="City" required error={errors.city}>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="City"
                  className={inputClass}
                  required
                />
              </div>
            </Field>

            <Field label="State" required error={errors.state}>
              <div className="relative">
                <Map className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="State"
                  className={inputClass}
                  required
                />
              </div>
            </Field>

            <Field label="Country" required error={errors.country}>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="Country"
                  className={inputClass}
                  required
                />
              </div>
            </Field>

            <Field label="Show Weight Permission" required className="md:col-span-2">
              <div className="relative flex items-center h-12 border border-slate-200 rounded-xl bg-slate-50/80 px-3">
                <Scale className="text-slate-400 w-5 h-5 mr-2 shrink-0" />
                <span className="text-slate-500 text-sm flex-1 font-medium select-none">
                  {showWeight ? "Enabled for this company" : "Disabled for this company"}
                </span>
                <input
                  type="checkbox"
                  checked={showWeight}
                  onChange={(e) => setShowWeight(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                />
              </div>
            </Field>
          </FormSection>

          {errors.api && (
            <div className="text-center bg-red-50 border border-red-100 p-3 rounded-xl text-red-600 font-medium text-xs">
              {errors.api}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md uppercase tracking-wide text-sm cursor-pointer bg-[#FF6B35] hover:bg-[#e85a2a]"
          >
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;

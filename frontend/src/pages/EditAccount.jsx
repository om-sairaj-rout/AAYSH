import { useEffect, useState } from "react";
import {
  Building2,
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Users,
  MapPin,
  MapPinned,
  Map,
  Globe,
  ArrowLeft,
  ShieldCheck,
  UserCircle,
  Scale
} from "lucide-react";
import {
  getAllUsers,
  updateUserAccount
} from "../api/authAPI";
import { toast } from "react-hot-toast"; // Imported for toast notifications

const EditAccount = () => {
  const [usersList, setUsersList] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // Form Controlled States for pre-filling data
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    mobile: "",
    company: "",
    gender: "others",
    address: "",
    zipCode: "",
    city: "",
    state: "",
    country: "",
    showWeight: true, // Added tracking field key parameter explicitly here
  });

  // ================= FETCH USERS ON INIT =================
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await getAllUsers();
        if (res.success) {
          setUsersList(res.users || []);
        }
      } catch (err) {
        console.error("Failed to load users:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // ================= PREFILL USER DATA FOR EDITING =================
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username || "",
      email: user.email || "",
      password: "", 
      mobile: user.mobile_number || "",
      company: user.company_name || "",
      gender: user.gender || "others",
      address: user.address || "",
      zipCode: user.zip_code || "",
      city: user.city || "",
      state: user.state || "",
      country: user.country || "",
      showWeight: user.showWeight !== undefined ? user.showWeight : true, // Natively prefill field flag straight from database value
    });
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Condition to correctly parse checkbox value changes instead of simple strings
    setFormData((prev) => ({ 
      ...prev, 
      [name]: type === "checkbox" ? checked : value 
    }));
  };

  // ================= VALIDATE & SUBMIT UPDATE =================
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (formData.username.trim().length < 3) {
      newErrors.username = "Username must contain at least 3 letters";
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }
    if (formData.password && formData.password.length < 6) {
      newErrors.password = "Password must contain at least 6 characters";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    try {
      const updatedPayload = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        mobile_number: formData.mobile.trim(),
        company_name: formData.company.trim(),
        gender: formData.gender,
        address: formData.address.trim(),
        zip_code: formData.zipCode.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        country: formData.country.trim(),
        showWeight: formData.showWeight, // Append the weight property into request payload bundle
      };

      if (formData.password) {
        updatedPayload.password = formData.password.trim();
      }

      await updateUserAccount(selectedUser._id, updatedPayload);
      toast.success("Changes applied successfully!"); // Swapped alert with toast cleanly
      
      // Refresh user list and go back
      setSelectedUser(null);
      const res = await getAllUsers();
      if (res.success) setUsersList(res.users || []);
    } catch (error) {
      setErrors({ api: error.message || "Failed to update account updates." });
    }
  };

  // ================= VIEW 1: RENDER ACCOUNT DIRECTORY =================
  if (!selectedUser) {
    return (
      <div className="w-full min-h-screen bg-[#F8FAFC] p-8 font-sans text-slate-700">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Account Management</h1>
            <p className="text-xs text-slate-400 font-medium mt-1">Select an active user file profile to perform system updates.</p>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400 font-medium">Loading user index records...</div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {usersList.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => handleSelectUser(user)}
                    className="flex items-center justify-between p-5 hover:bg-slate-50/80 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                        {user.isAdmin ? <ShieldCheck className="w-6 h-6 text-indigo-600" /> : <UserCircle className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">{user.username}</h3>
                        <p className="text-xs text-slate-400 font-medium">{user.email} • {user.company_name || "No Company"}</p>
                      </div>
                    </div>
                    
                    <span className={`text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-full border ${
                      user.role === "admin" 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      {user.role === "admin" ? "Admin" : "User"}
                    </span>
                  </div>
                ))}

                {usersList.length === 0 && (
                  <div className="p-12 text-center text-slate-400 text-sm font-medium">No user accounts found in dataset.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ================= VIEW 2: RENDER ACCOUNT EDIT FORM =================
  return (
    <div className="w-full h-full overflow-y-auto flex flex-col p-8 bg-[#F8FAFC]">
      <div className="max-w-xl w-full mx-auto space-y-6">
        
        {/* Back Navigation Bar Header */}
        <button 
          onClick={() => setSelectedUser(null)}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Accounts List
        </button>

        <div className="pb-2">
          <h2 className="text-xl font-black text-slate-900">Modify System Profile</h2>
          <p className="text-xs text-slate-400 font-medium mt-1">Editing credentials and configurations for: <span className="text-slate-700 font-bold">{selectedUser.username}</span></p>
        </div>

        {errors.api && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 font-medium text-xs">{errors.api}</div>
        )}

        <form className="grid grid-cols-4 gap-x-4 gap-y-6 pb-12" onSubmit={handleSubmit}>
          
          {/* Row 1 */}
          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Company Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                placeholder="Company Name" 
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                required
              />
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Full Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="John Doe" 
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm" 
                required 
              />
            </div>
            {errors.username && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.username}</p>}
          </div>

          {/* Row 2 */}
          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Mobile Number <span className="text-red-500">*</span></label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                name="mobile"
                value={formData.mobile}
                onChange={handleInputChange}
                placeholder="9876543210" 
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                required
              />
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Email Address <span className="text-red-500">*</span></label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="john@example.com" 
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                required 
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.email}</p>}
          </div>

          {/* Row 3 */}
          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Password <span className="text-slate-400 font-medium">(Leave blank to keep unchanged)</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type={showPassword ? "text" : "password"} 
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter new password" 
                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm" 
              />
              <div 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </div>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.password}</p>}
          </div>

          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Gender <span className="text-red-500">*</span></label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select 
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100/50 appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-700" 
                required 
              >
                <option value="others">others</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          {/* Row 4: Full Width Address */}
          <div className="col-span-4">
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Address <span className="text-red-500">*</span></label>
            <div className="relative">
              <MapPin className="absolute left-3 top-4 text-gray-400 w-5 h-5" />
              <textarea 
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter your full address" 
                rows="3" 
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm resize-none" 
                required
              ></textarea>
            </div>
          </div>

          {/* Row 5: Geographic Context Fields */}
          <div className="col-span-1">
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Zip Code <span className="text-red-500">*</span></label>
            <div className="relative">
              <MapPinned className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                name="zipCode"
                value={formData.zipCode}
                onChange={handleInputChange}
                placeholder="Zip Code" 
                className="w-full pl-10 pr-2 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm" 
                required 
              />
            </div>
          </div>

          <div className="col-span-1">
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">City <span className="text-red-500">*</span></label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="City" 
                className="w-full pl-10 pr-2 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm" 
                required 
              />
            </div>
          </div>

          <div className="col-span-1">
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">State <span className="text-red-500">*</span></label>
            <div className="relative">
              <Map className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                placeholder="State" 
                className="w-full pl-10 pr-2 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm" 
                required 
              />
            </div>
          </div>

          <div className="col-span-1">
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Country <span className="text-red-500">*</span></label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                placeholder="Country" 
                className="w-full pl-10 pr-2 py-3 border border-gray-200 rounded-xl bg-gray-100/50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm" 
                required 
              />
            </div>
          </div>

          {/* ================= ATTACHED MATCHING STYLE CHECKBOX UNIT ================= */}
          <div className="col-span-4">
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
              Show Weight Permission <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center h-11.5 border border-gray-200 rounded-xl bg-gray-100/50 px-3">
              <Scale className="text-gray-400 w-5 h-5 mr-2 shrink-0" />
              <span className="text-gray-500 text-sm flex-1 font-medium select-none">
                {formData.showWeight ? "Enabled" : "Disabled"}
              </span>
              <input 
                type="checkbox" 
                name="showWeight"
                checked={formData.showWeight}
                onChange={handleInputChange}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
              />
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="col-span-4 mt-2 flex gap-3">
            <button 
              type="button"
              onClick={() => setSelectedUser(null)}
              className="w-1/3 py-3 rounded-xl font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all uppercase tracking-wide text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="w-2/3 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md uppercase tracking-wide text-sm cursor-pointer bg-[#FF6B35] hover:bg-[#e85a2a]"
            >
              Apply Changes
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EditAccount;
import { useEffect, useState } from "react";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  MapPinned,
  Map,
  Globe,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  UserCircle,
  Trash2,
  AlertTriangle,
  FileText
} from "lucide-react";
import {
  getAllUsers,
  deleteUserAccount
} from "../api/authAPI";
import { toast } from "../utils/toast";
import { useConfirm } from "../components/ConfirmDialog";

const RemoveAccount = () => {
  const { confirm } = useConfirm();
  const [usersList, setUsersList] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getAllUsers();
      if (res.success) {
        setUsersList(res.users || []);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setConfirmName("");
    setError("");
  };

  const handleDelete = async (e) => {
    e.preventDefault();

    if (confirmName !== selectedUser.companyName) {
      setError("The company name entered does not match.");
      return;
    }

    const secureConfirm = await confirm({
      title: "Permanently delete account",
      message: `Are you absolutely sure you want to permanently delete ${selectedUser.companyName}'s account?\n\nThis action cannot be undone.`,
      confirmLabel: "Delete account",
      cancelLabel: "Keep account",
      variant: "danger",
    });

    if (!secureConfirm) return;

    try {
      await deleteUserAccount(selectedUser._id);
      toast.success("Account has been permanently removed.");
      setSelectedUser(null);
      fetchUsers(); 
    } catch (err) {
      setError(err.message || "Failed to remove the account. Please try again.");
    }
  };

  if (!selectedUser) {
    return (
      <div className="w-full min-h-screen bg-[#F8FAFC] p-8 font-sans text-slate-700">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Remove Account</h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Select an account profile below to permanently purge it from the system database.
            </p>
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
                    className="flex items-center justify-between p-5 hover:bg-rose-50/40 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-rose-100 group-hover:text-rose-600 transition-colors">
                        {user.isAdmin ? <ShieldCheck className="w-6 h-6 text-indigo-600" /> : <UserCircle className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm group-hover:text-rose-700 transition-colors">
                          {user.companyName}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-full border ${
                        user.role === "admin" 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                        {user.role === "admin" ? "Admin" : "User"}
                      </span>
                      <Trash2 className="w-4 h-4 text-slate-300 group-hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100" />
                    </div>
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

  return (
    <div className="w-full h-full overflow-y-auto flex flex-col p-8 bg-[#F8FAFC]">
      <div className="max-w-xl w-full mx-auto space-y-6">
        
        {/* Back Navigation Bar Header */}
        <button 
          onClick={() => setSelectedUser(null)}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Accounts List
        </button>

        {/* Warning Callout Box */}
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-rose-900">Critical Destructive Action</h4>
            <p className="text-xs text-rose-700/90 font-medium mt-0.5 leading-relaxed">
              You are preparing to delete this profile file directory permanently. All related metrics, billing records, and system logs mapped to this identity reference will be decoupled.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 font-bold text-xs">{error}</div>
        )}

        {/* Read-Only Information Layout Grid - Exactly Matched to EditAccount */}
        <div className="grid grid-cols-4 gap-x-4 gap-y-6 opacity-75 select-none pointer-events-none">
          
          {/* Row 1 */}
          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Company Name</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" value={selectedUser.companyName || "-"} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-sm" disabled />
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Website</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" value={selectedUser.website || "-"} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-sm" disabled />
            </div>
          </div>

          {/* Row 2 */}
          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Mobile Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" value={selectedUser.mobile_number || "-"} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-sm" disabled />
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" value={selectedUser.email || "-"} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-sm" disabled />
            </div>
          </div>

          {/* Row 3 */}
          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">GSTIN</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" value={selectedUser.gstin || "-"} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-sm" disabled />
            </div>
          </div>

          <div className="col-span-4">
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Role</label>
            <div className="relative">
              <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" value={selectedUser.role || "user"} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-sm" disabled />
            </div>
          </div>

          {/* Row 4: Full Width Address */}
          <div className="col-span-4">
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-4 text-gray-400 w-5 h-5" />
              <textarea value={selectedUser.address || "-"} rows="3" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-sm resize-none" disabled></textarea>
            </div>
          </div>

          {/* Row 5: Geographic Context Fields */}
          <div className="col-span-1">
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Zip Code</label>
            <div className="relative">
              <MapPinned className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" value={selectedUser.zip_code || "-"} className="w-full pl-10 pr-2 py-3 border border-gray-200 rounded-xl bg-gray-100 text-sm" disabled />
            </div>
          </div>

          <div className="col-span-1">
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">City</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" value={selectedUser.city || "-"} className="w-full pl-10 pr-2 py-3 border border-gray-200 rounded-xl bg-gray-100 text-sm" disabled />
            </div>
          </div>

          <div className="col-span-1">
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">State</label>
            <div className="relative">
              <Map className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" value={selectedUser.state || "-"} className="w-full pl-10 pr-2 py-3 border border-gray-200 rounded-xl bg-gray-100 text-sm" disabled />
            </div>
          </div>

          <div className="col-span-1">
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Country</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" value={selectedUser.country || "-"} className="w-full pl-10 pr-2 py-3 border border-gray-200 rounded-xl bg-gray-100 text-sm" disabled />
            </div>
          </div>
        </div>

        {/* Secure Double Verification Action Layer Form */}
        <form onSubmit={handleDelete} className="border-t border-slate-200 pt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              To confirm, type <span className="font-black text-rose-600 select-all font-mono">"{selectedUser.companyName}"</span> below:
            </label>
            <input
              type="text"
              required
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Type company name exact match"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-sm font-semibold bg-white"
            />
          </div>

          <div className="flex gap-3">
            <button 
              type="button"
              onClick={() => setSelectedUser(null)}
              className="w-1/3 py-3 rounded-xl font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all uppercase tracking-wide text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={confirmName !== selectedUser.companyName}
              className="w-2/3 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md uppercase tracking-wide text-sm disabled:opacity-40 disabled:cursor-not-allowed bg-rose-600 hover:bg-rose-700 shadow-rose-600/10"
            >
              <Trash2 className="w-4 h-4" /> Delete Account
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default RemoveAccount;
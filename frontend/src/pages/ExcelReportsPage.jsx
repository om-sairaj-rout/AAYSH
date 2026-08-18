import { useEffect, useState } from 'react';
import { User, Download, Upload, Search, ShieldAlert, Loader2 } from 'lucide-react';
import { getAllUsers } from "../api/authAPI";
import { downloadUserOrdersExcel } from '../api/uploadAPI';
import { uploadAndUpdateStatusExcel } from "../api/uploadAPI"; 
import { toast } from 'react-hot-toast'; // Imported for crisp status messages

const ExcelReportsPage = () => {
  const [usersData, setUsersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingUserId, setUploadingUserId] = useState(null); // Track separate row loading states

  useEffect(() => {
    const fetchReportsDashboard = async () => {
      try {
        setLoading(true);
        const data = await getAllUsers();
        setUsersData(data.users || data);
      } catch (err) {
        console.error("Dashboard error:", err);
        setError("Failed to retrieve user registry and statement directories.");
      } finally {
        setLoading(false);
      }
    };

    fetchReportsDashboard();
  }, []);

  // Filter users based on search string matching name or email
  const filteredUsers = usersData.filter((u) => {
    const companyName = u?.companyName || "";
    const email = u?.email || "";

    return (
      companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleDownloadFile = async (userId) => {
    try {
      const blob = await downloadUserOrdersExcel(userId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${userId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  // ================= NEW EXCEL FILE STATUS UPLOAD HANDLER =================
  const handleUploadStatusExcel = async (
  e,
  userId
) => {
  const file = e.target.files[0];
  if (!file) return;

  if (
    !file.name.endsWith(".xlsx") &&
    !file.name.endsWith(".xls")
  ) {
    toast.error("Invalid format! Please upload .xlsx file"); // Swapped alert with toast cleanly
    e.target.value = "";
    return;
  }

  try {
    setUploadingUserId(userId);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);

    const res =
      await uploadAndUpdateStatusExcel(
        userId,
        formData
      );

    toast.success(`Success!\nUpdated: ${res.updated}\nNot Found: ${res.notFound}`); // Swapped alert with toast cleanly

  } catch (err) {
    console.error(err);
    toast.error(err.message || "Upload failed"); // Swapped alert with toast cleanly
  } finally {
    setUploadingUserId(null);
    e.target.value = "";
  }
};

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-500">Mapping client data registries...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 font-sans text-slate-700">
        <div className="bg-white p-6 rounded-xl border border-gray-100 max-w-md text-center shadow-sm space-y-4">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Access Interrupted</h2>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] p-4 font-sans text-[#1E293B]">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* Navigation & Search Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Update Status</h1>
            <p className="text-xs text-slate-500 mt-0.5">Download order sheets and bulk-update shipment status per user</p>
          </div>
          
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text"
              placeholder="Search users or emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 text-xs rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Unified Card Layout */}
        <div className="grid grid-cols-1 gap-3">
          {filteredUsers.map((userItem) => {
            const isRowUploading = uploadingUserId === userItem._id;

            return (
              <div 
                key={userItem._id}
                className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Section A: User Identity Badge */}
                <div className="flex items-center gap-3 min-w-50 max-w-xs truncate">
                  <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <h2 className="text-sm font-bold text-slate-800 truncate">{userItem.companyName}</h2>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{userItem.email}</p>
                  </div>
                </div>

                {/* Section C: Combined Action Buttons Column Grid */}
                <div className="flex items-center gap-2 sm:justify-end shrink-0 w-full sm:w-auto">
                  
                  {/* Download Action Component */}
                  <button
                    onClick={() => handleDownloadFile(userItem._id)}
                    className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold tracking-wide px-4 py-2 rounded-lg transition-colors shadow-sm inline-flex items-center justify-center gap-1.5 h-9"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>

                  {/* NEW: Upload Sheet & Change Status Button Wrapper Component */}
                  <label 
                    className={`flex-1 sm:flex-initial text-xs font-bold tracking-wide px-4 py-2 rounded-lg transition-colors shadow-sm inline-flex items-center justify-center gap-1.5 h-9 cursor-pointer border ${
                      isRowUploading 
                        ? 'bg-slate-50 text-slate-400 border-gray-200 cursor-wait' 
                        : 'bg-white hover:bg-slate-50 text-indigo-600 border-indigo-200 hover:border-indigo-300'
                    }`}
                  >
                    {isRowUploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Update Status</span>
                      </>
                    )}
                    
                    {/* Hidden Input Layer capturing files */}
                    <input 
                      type="file"
                      accept=".xlsx, .xls"
                      disabled={isRowUploading}
                      onChange={(e) => handleUploadStatusExcel(e, userItem._id)}
                      className="hidden" 
                    />
                  </label>

                </div>

              </div>
            );
          })}

          {filteredUsers.length === 0 && (
            <div className="bg-white border border-gray-100 p-12 text-center rounded-xl text-slate-400 text-xs font-medium shadow-sm">
              No matching user profiles found in current registry.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ExcelReportsPage;
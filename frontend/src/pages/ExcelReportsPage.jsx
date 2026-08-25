import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Building2, Download, Upload, Search, ShieldAlert, Loader2 } from 'lucide-react';
import { canAccess } from '../utils/permissions';
import {
  getStatusUpdateCompanies,
  downloadCompanyOrdersExcel,
  uploadAndUpdateStatusExcel,
} from "../api/uploadAPI";
import { toast } from '../utils/toast';

const ExcelReportsPage = () => {
  const { user } = useSelector((state) => state.auth);
  const canWrite = canAccess(user, "upload", "write");
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingCompanyId, setUploadingCompanyId] = useState(null);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStatusUpdateCompanies();
      setCompanies(data.companies || []);
    } catch (err) {
      console.error("Dashboard error:", err);
      setError(err.message || "Failed to retrieve companies for status update.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const filteredCompanies = companies.filter((company) => {
    const companyName = company?.companyName || "";
    const companyID = company?.companyID || "";

    return (
      companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      companyID.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleDownloadFile = async (companyID) => {
    try {
      const blob = await downloadCompanyOrdersExcel(companyID);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${companyID}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to download order sheet");
    }
  };

  const handleUploadStatusExcel = async (e, companyID) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.validation("Invalid format! Please upload .xlsx file");
      e.target.value = "";
      return;
    }

    try {
      setUploadingCompanyId(companyID);

      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadAndUpdateStatusExcel(companyID, formData);

      toast.success(`Success! Updated: ${res.updated} · Not Found: ${res.notFound}`);
      await loadCompanies();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingCompanyId(null);
      e.target.value = "";
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-500">Loading companies...</p>
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
    <div className="w-full min-h-full max-w-full overflow-x-hidden bg-[#F8FAFC] p-2 sm:p-4 font-sans text-[#1E293B]">
      <div className="max-w-4xl mx-auto space-y-4">

        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Update Status</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Download order sheets and bulk-update shipment status per company
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 text-xs rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {filteredCompanies.map((company) => {
            const isRowUploading = uploadingCompanyId === company.companyID;

            return (
              <div
                key={company.companyID}
                className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-800 truncate">
                      {company.companyName}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {company.companyID}
                      {company.pendingCount > 0
                        ? ` · ${company.pendingCount} shipment${company.pendingCount === 1 ? "" : "s"} pending update`
                        : " · No shipments pending update"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:justify-end shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => handleDownloadFile(company.companyID)}
                    className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold tracking-wide px-4 py-2 rounded-lg transition-colors shadow-sm inline-flex items-center justify-center gap-1.5 h-9"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>

                  <label
                    className={`flex-1 sm:flex-initial text-xs font-bold tracking-wide px-4 py-2 rounded-lg transition-colors shadow-sm inline-flex items-center justify-center gap-1.5 h-9 border ${
                      !canWrite
                        ? "bg-slate-50 text-slate-400 border-gray-200 cursor-not-allowed opacity-50"
                        : isRowUploading
                        ? "bg-slate-50 text-slate-400 border-gray-200 cursor-wait"
                        : "bg-white hover:bg-slate-50 text-indigo-600 border-indigo-200 hover:border-indigo-300 cursor-pointer"
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

                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      disabled={!canWrite || isRowUploading}
                      onChange={(e) => handleUploadStatusExcel(e, company.companyID)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            );
          })}

          {filteredCompanies.length === 0 && (
            <div className="bg-white border border-gray-100 p-12 text-center rounded-xl text-slate-400 text-xs font-medium shadow-sm">
              {companies.length === 0
                ? "No companies registered yet."
                : "No matching companies found."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcelReportsPage;

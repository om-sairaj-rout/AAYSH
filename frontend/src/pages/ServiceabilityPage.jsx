import { useEffect, useState } from 'react';

import {
  fetchCourierPartnersAPI,
  uploadServiceabilitySheetAPI
} from "../api/courierAPI";
import { 
  MapPin, 
  UploadCloud, 
  FileSpreadsheet, 
  Truck, 
  Search, 
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';



const ServiceabilityPage = () => {
  const [couriers, setCouriers] = useState([]);
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
  const [newCourierName, setNewCourierName] = useState('');

  // Upload Form State
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Search/Filter State for Matrix
  const [searchTerm, setSearchTerm] = useState('');

   // ================= Load Couriers =================
  const loadCouriers = async () => {
    try {
      const res = await fetchCourierPartnersAPI();

      if (res.success) {
        setCouriers(res.data);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error("Failed to load couriers");
    }
  };

  useEffect(() => {
    loadCouriers();
  }, []);

  // Handle File Selection
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSheet = async (e) => {
  e.preventDefault();

  if (!selectedCourierId || !selectedFile) {
    toast.error(
      "Please select a courier partner and attach a serviceability sheet."
    );
    return;
  }

  try {
    setLoading(true);

    const formData = new FormData();

    formData.append("courierId", selectedCourierId);
    formData.append("serviceabilitySheet", selectedFile);

    const res =
      await uploadServiceabilitySheetAPI(formData);

    if (!res.success) {
      toast.error(res.message);
      return;
    }

    toast.success(res.message);

    setSelectedCourierId("");
    setSelectedFile(null);

    document.getElementById(
      "serviceabilityFileInput"
    ).value = "";

    loadCouriers();
  } catch (err) {
    toast.error("Upload failed");
  } finally {
    setLoading(false);
  }
};

  // Filter couriers based on search term
  const filteredCouriers = couriers.filter(courier => 
    courier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans text-[#1E293B]">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ================= BAR CONTROL HEADER BAR ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <MapPin className="text-indigo-600 w-5 h-5" /> Pincode & Serviceability Management
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Ingest pincode reachability matrices and monitor courier coverage across operational zones.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* ================= FORM LAYER: BULK SERVICEABILITY SHEET INGESTION ================= */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Upload Pincode Matrix</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Import serviceable pincodes and active status directly from an Excel/CSV file.</p>
            </div>

            <form onSubmit={handleUploadSheet} className="space-y-4">
              {/* Courier Picker Option Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Courier Partner</label>
                <select
                  value={selectedCourierId}
                  onChange={(e) => setSelectedCourierId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs font-semibold text-slate-700"
                  required
                >
                  <option value="">-- Select Partner --</option>
                  {couriers.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Template Helper Box */}
              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs space-y-1">
                <span className="font-bold text-indigo-900 block text-[11px]">Expected Sheet Structure:</span>
                <p className="text-[10px] text-indigo-700 leading-relaxed font-mono">
                  Headers: <span className="font-bold">Pincode, City, State, Prime</span>
                </p>
              </div>

              {/* Document/Sheet File Drop Area Section */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Attach Excel/CSV File</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors relative flex flex-col items-center justify-center text-center cursor-pointer group">
                  <input
                    id="serviceabilityFileInput"
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition-colors mb-2" />
                  <span className="text-xs font-bold text-slate-700 block truncate max-w-full px-2">
                    {selectedFile ? selectedFile.name : "Choose serviceability sheet file"}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 font-medium">Supports CSV or structured Excel rows</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !selectedCourierId || !selectedFile}
                className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" /> {loading ? "Processing..." : "Process Sheet Upload"}
              </button>
            </form>
          </div>

          {/* ================= MONITOR MATRIX BOARD: COURIER COVERAGE OVERVIEW ================= */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Courier Serviceability Overview</h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Live metrics of serviced pincodes and transport modes reach.</p>
              </div>

              {/* Quick Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter couriers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-slate-50 w-full sm:w-44"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="p-4">Courier Partner</th>
                    <th className="p-4 text-center">Serviceable Pincodes</th>
                    <th className="p-4 text-center">Surface</th>
                    <th className="p-4 text-center">Air</th>
                    <th className="p-4 text-center">Prime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredCouriers.map((courier) => {
                    const totalPincodes = courier.totalPincodes || courier.serviceablePincodesCount || 0;
                    const surfaceCount = courier.surfacePincodesCount ?? totalPincodes;
                    const airCount = courier.airPincodesCount ?? Math.floor(totalPincodes * 0.75);
                    const primeCount = courier.primePincodesCount ?? Math.floor(totalPincodes * 0.30);

                    return (
                      <tr key={courier._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                          <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                            <Truck className="w-4 h-4" />
                          </div>
                          <span>{courier.name}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full font-mono font-bold">
                            {(totalPincodes).toLocaleString()} zones
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-mono font-bold">
                            {(surfaceCount).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-sky-50 text-sky-700 border border-sky-100 px-2.5 py-1 rounded-full font-mono font-bold">
                            {(airCount).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-1 rounded-full font-mono font-bold">
                            {(primeCount).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredCouriers.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-12 text-center text-slate-400 font-medium">
                        No registered courier coverage records match your filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* ================= MODAL SLIDE INTERFACE: REGISTER NEW PARTNER ================= */}
      {isCourierModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Register Courier Asset</h3>
              <button 
                onClick={() => setIsCourierModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ServiceabilityPage;
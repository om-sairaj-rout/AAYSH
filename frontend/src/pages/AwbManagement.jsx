import { useState, useEffect } from 'react';
import { 
  Truck, 
  Plus, 
  UploadCloud, 
  FileSpreadsheet, 
  Database, 
  Pencil,
  Trash2,
  X 
} from 'lucide-react';
import {
  fetchCourierPartnersAPI,
  addCourierPartnerAPI,
  uploadAwbSheetAPI,
  updateCourierPartnerAPI,
  deleteCourierPartnerAPI,
  fetchCourierAwbsAPI,
  updateAwbAPI,
  deleteAwbAPI,
} from "../api/courierAPI";
import { toast } from '../utils/toast';

const AwbManagement = () => {
  const [couriers, setCouriers] = useState([]);
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
  const [newCourierName, setNewCourierName] = useState('');
  
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [weightCategory, setWeightCategory] = useState('under3kg'); 
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [awbDrawer, setAwbDrawer] = useState(null);
  const [awbs, setAwbs] = useState([]);
  const [editingAwb, setEditingAwb] = useState(null);

  const loadCouriers = async () => {
    try {
      const res = await fetchCourierPartnersAPI();
      if (res.success) setCouriers(res.data);
    } catch (err) {
      console.error("Failed loading courier master index:", err); 
    }
  };

  useEffect(() => {
    loadCouriers();
  }, []);

  const handleAddCourier = async (e) => {
    e.preventDefault();
    if (!newCourierName.trim()) return;

    try {
      setLoading(true);
      const res = await addCourierPartnerAPI(newCourierName.trim());
      if (res.success) {
        toast.success(`Courier partner "${newCourierName}" added successfully.`);
        setNewCourierName('');
        setIsCourierModalOpen(false);
        loadCouriers();
      }
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRenameCourier = async (courier) => {
    const nextName = window.prompt("Edit courier partner name", courier.name);
    if (!nextName || !nextName.trim() || nextName.trim() === courier.name) return;
    try {
      await updateCourierPartnerAPI(courier._id, { name: nextName.trim() });
      toast.success("Courier updated");
      loadCouriers();
    } catch (err) {
      toast.error(err.message || "Failed to update courier");
    }
  };

  const handleDeleteCourier = async (courier) => {
    if (!window.confirm(`Delete ${courier.name} and all unused AWB/serviceability data?`)) return;
    try {
      await deleteCourierPartnerAPI(courier._id);
      toast.success("Courier deleted");
      loadCouriers();
    } catch (err) {
      toast.error(err.message || "Failed to delete courier");
    }
  };

  const openCategoryAwbs = async (courier, category, label) => {
    try {
      setLoading(true);
      const res = await fetchCourierAwbsAPI(courier._id, category);
      setAwbs(res.awbs || []);
      setAwbDrawer({ courier, category, label });
      setEditingAwb(null);
    } catch (err) {
      toast.error(err.message || "Failed to load AWBs");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAwb = async () => {
    if (!editingAwb?._id) return;
    try {
      await updateAwbAPI(editingAwb._id, {
        awbNumber: editingAwb.awbNumber,
        status: editingAwb.status,
        category: editingAwb.category,
      });
      toast.success("AWB updated");
      await openCategoryAwbs(awbDrawer.courier, awbDrawer.category, awbDrawer.label);
    } catch (err) {
      toast.error(err.message || "Failed to update AWB");
    }
  };

  const handleDeleteAwb = async (awb) => {
    if (!window.confirm(`Delete AWB ${awb.awbNumber}?`)) return;
    try {
      await deleteAwbAPI(awb._id);
      toast.success("AWB deleted");
      await openCategoryAwbs(awbDrawer.courier, awbDrawer.category, awbDrawer.label);
    } catch (err) {
      toast.error(err.message || "Failed to delete AWB");
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSheet = async (e) => {
    e.preventDefault();
    if (!selectedCourierId || !selectedFile) {
      toast.validation('Please select a courier company and attach an AWB tracking sheet.'); 
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('courierId', selectedCourierId);
      formData.append('category', weightCategory); 
      formData.append('awbSheet', selectedFile);

      const res = await uploadAwbSheetAPI(formData);
      if (res.success) {
        toast.success(`Successfully loaded AWB records from sheet.`);
        setSelectedFile(null);
        document.getElementById('awbFileInput').value = '';
        loadCouriers();
      }
    } catch (err) {
      toast.error('Failed processing data parsing for uploaded sheet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full w-full min-h-full max-w-full overflow-x-hidden bg-[#F8FAFC] p-3 sm:p-4 md:p-8 font-sans text-[#1E293B]">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ================= BAR CONTROL HEADER BAR ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Database className="text-indigo-600 w-5 h-5" /> AWB Inventory Management
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Ingest bulk serial numbers and audit remaining available unbooked tracking codes.
            </p>
          </div>
          <button
            onClick={() => setIsCourierModalOpen(true)}
            className="bg-[#1E293B] hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Courier Company
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* ================= FORM LAYER: BULK SHEET INGESTION ================= */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Upload AWB Numbers</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Parse tracking blocks directly from a document sheet layout.</p>
            </div>

            <form onSubmit={handleUploadSheet} className="space-y-4">
              {/* Courier Picker Option Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Courier Partner</label>
                <select
                  value={selectedCourierId}
                  onChange={(e) => setSelectedCourierId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-semibold text-slate-700"
                  required
                >
                  <option value="">-- Select Partner --</option>
                  {couriers.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Explicit Bifurcated Category Selector Toggle */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Weight Consignment Category</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWeightCategory('under3kg')}
                    className={`py-2.5 rounded-xl border font-bold text-xs transition-all ${
                      weightCategory === 'under3kg'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Under 3 kg
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeightCategory('over3kg')}
                    className={`py-2.5 rounded-xl border font-bold text-xs transition-all ${
                      weightCategory === 'over3kg'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Over 3 kg
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeightCategory('prime')}
                    className={`py-2.5 rounded-xl border font-bold text-xs transition-all ${
                      weightCategory === 'prime'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Prime
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeightCategory('codToPay')}
                    className={`py-2.5 rounded-xl border font-bold text-xs transition-all ${
                      weightCategory === 'codToPay'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    COD/TO PAY
                  </button>
                </div>
              </div>

              {/* Document/Sheet File Drop Area Section */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Attach Excel/CSV File</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors relative flex flex-col items-center justify-center text-center cursor-pointer group">
                  <input
                    id="awbFileInput"
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required
                  />
                  <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition-colors mb-2" />
                  <span className="text-xs font-bold text-slate-700 block truncate max-w-full px-2">
                    {selectedFile ? selectedFile.name : "Choose sheet file package"}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 font-medium">Supports CSV or structured Excel rows</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !selectedCourierId || !selectedFile}
                className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" /> {loading ? "Processing..." : "Process Sheet Upload"}
              </button>
            </form>
          </div>

          {/* ================= MONITOR MATRIX BOARD: REAL-TIME SLOTS INVENTORY ================= */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Available Unbooked Stocks</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Live index count of active AWB values currently waiting assignment.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="p-4">Courier Network Provider</th>
                    <th className="p-4 text-center">Remaining (&lt; 3 kg)</th>
                    <th className="p-4 text-center">Remaining (&gt; 3 kg)</th>
                    <th className="p-4 text-center">Remaining (Prime)</th>
                    <th className="p-4 text-center">COD/TO PAY</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {couriers.map((courier) => (
                      <tr key={courier._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                              <Truck className="w-4 h-4" />
                            </div>
                            <span>{courier.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <button type="button" onClick={() => openCategoryAwbs(courier, "under3kg", "Remaining (<3 kg)")} className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-mono font-bold">
                            {(courier.unbookedUnder1kg || 0).toLocaleString()} available
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          <button type="button" onClick={() => openCategoryAwbs(courier, "over3kg", "Remaining (>3 kg)")} className="bg-orange-50 text-orange-700 border border-orange-100 px-2.5 py-1 rounded-full font-mono font-bold">
                            {(courier.unbookedOver3kg || 0).toLocaleString()} available
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          <button type="button" onClick={() => openCategoryAwbs(courier, "prime", "Remaining (Prime)")} className="bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-1 rounded-full font-mono font-bold">
                            {(courier.unbookedPrime || 0).toLocaleString()} available
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          <button type="button" onClick={() => openCategoryAwbs(courier, "codToPay", "COD/TO PAY")} className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full font-mono font-bold">
                            {(courier.unbookedCodToPay || 0).toLocaleString()} available
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <button type="button" onClick={() => handleRenameCourier(courier)} className="inline-flex p-1.5 text-slate-500 hover:text-indigo-600" title="Edit courier">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => handleDeleteCourier(courier)} className="inline-flex p-1.5 text-slate-500 hover:text-rose-600" title="Delete courier">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                  ))}

                  {couriers.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-12 text-center text-slate-400 font-medium">
                        No registered shipping channels mapped. Create one above.
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Register Courier Asset</h3>
              <button 
                onClick={() => setIsCourierModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCourier} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Company Entity Name</label>
                <input
                  type="text"
                  value={newCourierName}
                  onChange={(e) => setNewCourierName(e.target.value)}
                  placeholder="e.g., FedEx Express, XpressBees"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-semibold text-slate-800"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCourierModalOpen(false)}
                  className="w-1/3 py-2.5 border border-slate-200 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors uppercase tracking-wider"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  disabled={loading || !newCourierName.trim()}
                  className="w-2/3 py-2.5 bg-[#1E293B] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors shadow-sm uppercase tracking-wider flex items-center justify-center gap-1"
                >
                  {loading ? "Adding..." : "Add Partner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {awbDrawer && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="text-sm font-black uppercase">{awbDrawer.courier.name} — {awbDrawer.label}</h3>
                <p className="text-xs text-slate-400">{awbs.length} AWB record(s)</p>
              </div>
              <button type="button" onClick={() => setAwbDrawer(null)}><X className="w-4 h-4" /></button>
            </div>
            <div className="overflow-auto max-h-[70vh]">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-3 text-left">AWB Number</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {awbs.map((awb) => (
                    <tr key={awb._id} className="border-t">
                      <td className="p-3 font-mono">
                        {editingAwb?._id === awb._id ? (
                          <input
                            value={editingAwb.awbNumber}
                            onChange={(e) => setEditingAwb({ ...editingAwb, awbNumber: e.target.value })}
                            className="border rounded px-2 py-1 w-full"
                          />
                        ) : (
                          awb.awbNumber
                        )}
                      </td>
                      <td className="p-3">
                        {editingAwb?._id === awb._id ? (
                          <select
                            value={editingAwb.status}
                            onChange={(e) => setEditingAwb({ ...editingAwb, status: e.target.value })}
                            className="border rounded px-2 py-1"
                          >
                            <option value="available">available</option>
                            <option value="booked">booked</option>
                          </select>
                        ) : (
                          awb.status
                        )}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        {editingAwb?._id === awb._id ? (
                          <>
                            <button type="button" className="text-emerald-600 font-bold" onClick={handleSaveAwb}>Save</button>
                            <button type="button" className="text-slate-500" onClick={() => setEditingAwb(null)}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="text-indigo-600" onClick={() => setEditingAwb({ ...awb })}>Edit</button>
                            <button type="button" className="text-rose-600" onClick={() => handleDeleteAwb(awb)}>Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {awbs.length === 0 && (
                    <tr><td colSpan={3} className="p-8 text-center text-slate-400">No AWBs in this category</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AwbManagement;
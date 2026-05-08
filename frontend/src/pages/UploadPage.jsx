import { Upload, FileSpreadsheet, CheckCircle, Loader2, AlertCircle, Clock, Trash2, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { uploadFile, getUploadHistory, deleteUploadRecord } from '../api/uploadAPI';

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null); // Track which row is being hidden
  const [status, setStatus] = useState({ type: '', message: '' });
  const [history, setHistory] = useState([]);

  const loadHistory = async () => {
    try {
      const result = await getUploadHistory();
      console.log(result);
      if (result.success) setHistory(result.history);
    } catch (error) {
      console.error("Failed to load history", error);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const result = await uploadFile(file);
      setStatus({ type: 'success', message: result.message });
      setFile(null);
      await loadHistory(); // Wait for history to refresh
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistory = async (id) => {
    if (window.confirm("Hide this manifest from your view?")) {
      setDeletingId(id); // Start UI fade
      try {
        await deleteUploadRecord(id);
        await loadHistory(); // Refresh from server
      } catch (error) {
        alert(error.message || "Failed to hide record");
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-slate-700 space-y-8">
      {/* Upload Section */}
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight uppercase">Upload Orders</h1>
          {status.message && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold animate-in fade-in slide-in-from-top-2 ${
              status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {status.message}
            </div>
          )}
        </div>

        <div className="p-8 flex flex-row items-start gap-6">
          <div className="relative group flex-1">
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
              onChange={(e) => setFile(e.target.files[0])}
              disabled={loading}
            />
            <div className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all ${
              file ? 'border-green-400 bg-green-50' : 'border-gray-200 group-hover:border-orange-400 group-hover:bg-orange-50'
            }`}>
              <div className={`p-4 rounded-full mb-3 ${file ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-500'}`}>
                {file ? <CheckCircle size={32} /> : <FileSpreadsheet size={32} />}
              </div>
              <div className="text-center">
                <p className={file ? "font-semibold text-slate-800" : "text-xl font-medium"}>
                  {file ? file.name : "Drop your manifest here"}
                </p>
                <p className="text-sm text-slate-400 mt-1">Excel or CSV only</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-1/4">
            <button 
              onClick={() => {setFile(null); setStatus({type:'', message:''})}}
              className="py-3 border-2 border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-all uppercase text-xs"
            >
              Reset
            </button>
            <button 
              onClick={handleUpload}
              disabled={!file || loading}
              className={`py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md uppercase text-sm ${
                file && !loading ? 'bg-[#FF6B35] hover:bg-[#e85a2a]' : 'bg-gray-300'
              }`}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Upload"}
            </button>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-2">
          <Clock size={20} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Recent Manifests</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-400 tracking-widest">
              <tr>
                <th className="px-6 py-4">File Name</th>
                <th className="px-6 py-4">Upload Date</th>
                <th className="px-6 py-4 text-center">Items</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {history.map((item) => (
                <tr key={item._id} className={`transition-all duration-300 ${deletingId === item._id ? 'opacity-30 grayscale' : ''}`}>
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="p-2 bg-orange-50 text-orange-500 rounded-lg"><FileText size={16} /></div>
                    <span className="font-semibold text-slate-700">{item.fileName}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(item.uploadDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">{item.totalRows} Rows</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDeleteHistory(item._id)}
                      disabled={deletingId === item._id}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      {deletingId === item._id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length === 0 && (
            <div className="p-12 text-center text-slate-400 italic">No active manifests found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
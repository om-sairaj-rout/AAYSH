import { X, CheckCircle2, XCircle, Package, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';

const OrderAssignmentDetailsModal = ({ isOpen, onClose, responseData }) => {
  if (!isOpen || !responseData) return null;

  const { summary, data } = responseData;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('AWB Number copied!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all">
      
      {/* ================= MODAL CONTAINER ================= */}
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* ================= HEADER ================= */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Order Assignment Details
              </h2>
              <p className="text-xs font-medium text-slate-500">
                AWB assignment execution summary
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all cursor-pointer focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= SUMMARY STATS CARDS ================= */}
        <div className="grid grid-cols-3 gap-4 px-6 pt-6 bg-slate-50/50">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Processed</span>
            <span className="text-2xl font-black text-slate-900 mt-1">{summary?.total || 0}</span>
          </div>

          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100/80 shadow-sm flex flex-col">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Successful
            </span>
            <span className="text-2xl font-black text-emerald-700 mt-1">{summary?.success || 0}</span>
          </div>

          <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-100/80 shadow-sm flex flex-col">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> Failed
            </span>
            <span className="text-2xl font-black text-rose-700 mt-1">{summary?.failed || 0}</span>
          </div>
        </div>

        {/* ================= ORDER DETAILS TABLE ================= */}
        <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Order Details</th>
                    <th className="py-3 px-4">Courier / Service</th>
                    <th className="py-3 px-4">AWB Number</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {data?.map((item, idx) => {
                    const isSuccess = Boolean(item.awbNumber);

                    return (
                      <tr key={item.orderId || idx} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* Order & Consignee info */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{item.orderId}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {item.consigneeName} ({item.destinationPincode})
                          </div>
                        </td>

                        {/* Courier & Service info */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{item.courier || 'N/A'}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                              {item.serviceType}
                            </span>
                            {item.category && (
                              <span className="text-[10px] font-medium text-slate-400">
                                • {item.category}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* AWB Number */}
                        <td className="py-3.5 px-4 font-mono">
                          {item.awbNumber ? (
                            <div className="flex items-center gap-1.5">
                              <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded-md font-semibold">
                                {item.awbNumber}
                              </span>
                              <button
                                onClick={() => copyToClipboard(item.awbNumber)}
                                className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                                title="Copy AWB"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Not Assigned</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 text-right">
                          {isSuccess ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/50">
                              <CheckCircle2 className="w-3 h-3" /> Assigned
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200/50">
                              <XCircle className="w-3 h-3" /> Failed
                            </span>
                          )}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ================= FOOTER ================= */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white sticky bottom-0 z-10 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all active:scale-95 cursor-pointer shadow-md"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

export default OrderAssignmentDetailsModal;
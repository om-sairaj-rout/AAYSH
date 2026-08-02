import { useState, useEffect } from 'react';
import { 
  X, 
  Zap,
  Crown
} from 'lucide-react';
import { fetchCourierPartnersAPI } from "../api/courierAPI"; 
import { toast } from 'react-hot-toast';

const SelectCourier = ({ isOpen, onClose, onConfirm, selectedOrdersCount = 2 }) => {
  const [selectedCourier, setSelectedCourier] = useState(null);
const [selectedCourierName, setSelectedCourierName] = useState("");

const [isPrime, setIsPrime] = useState(false);

  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(false);


  // ✅ FETCH COURIERS FROM DB
  useEffect(() => {
    const loadCouriers = async () => {
      try {
        setLoading(true);

        const res = await fetchCourierPartnersAPI();

        if (res?.success) {
          setCouriers(res.data);
        } else {
          setCouriers([]);
        }

      } catch (err) {
        console.error("Courier fetch failed:", err);
        setCouriers([]);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
  loadCouriers();

  setIsPrime(false);

  setSelectedCourier(null);
  setSelectedCourierName("");
}
  }, [isOpen]);


  const handleApplyAndShip = () => {
    if (!selectedCourier) {
      toast.error("Please select a preferred courier company to continue.");
      return;
    }

    onConfirm({
    courierId: selectedCourier,
    courierName: selectedCourierName,
    isPrime
});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      
      {/* ================= MODAL SURFACE BODY CONTAINER ================= */}
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[92vh]">
        
        {/* ================= MODAL BAR HEADER ================= */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-base font-black text-slate-800 tracking-tight">
              Select Your Preferred Courier Company
            </h2>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              Processing <span className="text-indigo-600 font-bold">{selectedOrdersCount} selected shipments</span> forward into delivery channels.
            </p>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= MODAL CENTRAL OVERFLOW WORKSPACE ================= */}
        <div className="p-6 overflow-y-auto space-y-6 bg-[#F8FAFC]/50 flex-1">

          {/* Loading State */}
          {loading && (
            <p className="text-xs text-slate-500">Loading couriers...</p>
          )}
          {/* TWO-COLUMN GRID SELECTION COMPONENT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {couriers.map((courier) => {
              const isSelected = selectedCourier === courier._id;

              return (
                <div
                  key={courier._id}
                  onClick={() => {
    setSelectedCourier(courier._id);
    setSelectedCourierName(courier.name);
}}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group select-none ${
                    isSelected
                      ? 'bg-cyan-500 border-cyan-500 text-white shadow-md shadow-cyan-500/10'
                      : 'bg-[#E2F1ED]/60 border-[#CDE5DF] text-slate-700 hover:bg-[#E2F1ED] hover:border-[#b9ded5]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="radio"
                        name="courierSelection"
                        checked={isSelected}
                        onChange={() => {
    setSelectedCourier(courier._id);
    setSelectedCourierName(courier.name);
}}
                        className={`w-4 h-4 cursor-pointer focus:ring-0 ${
                          isSelected ? 'text-white border-white' : 'text-cyan-500 border-slate-300'
                        }`}
                      />
                    </div>

                    <span className="text-xs font-bold flex items-center gap-1.5">
                      {courier.icon && <Zap className="w-3.5 h-3.5 text-emerald-500" />}
                      {courier.name}
                    </span>
                  </div>

                  {/* Badge */}
                  {courier.tags?.length > 0 && (
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-amber-400 text-amber-950 font-extrabold'
                    }`}>
                      {courier.tags[0]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {/* PRIME SERVICE SELECTION TOGGLE */}
          <div 
            onClick={() => setIsPrime(!isPrime)}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between select-none ${
              isPrime 
                ? 'bg-purple-50 border-purple-400 shadow-sm' 
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isPrimeToggle"
                checked={isPrime}
                onChange={(e) => setIsPrime(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
              />
              <label htmlFor="isPrimeToggle" className="cursor-pointer flex items-center gap-2">
                <Crown className={`w-4 h-4 ${isPrime ? 'text-purple-600' : 'text-slate-400'}`} />
                <span className={`text-xs font-bold ${isPrime ? 'text-purple-900' : 'text-slate-700'}`}>
                  Use Prime Service
                </span>
              </label>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
              isPrime ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-500'
            }`}>
              {isPrime ? 'Prime Active' : 'Standard Delivery'}
            </span>
          </div>

        </div>

        {/* ================= MODAL BAR BOTTOM CONTROL LAYER ================= */}
        <div className="p-5 border-t border-slate-100 bg-white sticky bottom-0 z-10 flex flex-col md:flex-row gap-4 items-center justify-center">

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 md:flex-none px-5 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-500 uppercase tracking-wider hover:bg-slate-50 transition-colors cursor-pointer text-center"
            >
              Dismiss
            </button>

            <button
              type="button"
              onClick={handleApplyAndShip}
              className="flex-1 md:flex-none px-6 py-2.5 rounded-xl bg-[#2C7A8B] hover:bg-[#205b68] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-[#2C7A8B]/10 cursor-pointer text-center"
            >
              Apply and Ship
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default SelectCourier;
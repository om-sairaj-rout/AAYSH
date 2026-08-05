import { useState, useEffect } from 'react';
import { 
  X, 
  Truck, 
  Plane, 
  Zap, 
  CheckCircle2, 
  ArrowRight 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const SelectCourier = ({ isOpen, onClose, onConfirm, selectedOrdersCount = 2 }) => {
  const [selectedServiceType, setSelectedServiceType] = useState("");

  const serviceTypes = [
    {
      value: "Surface",
      title: "Surface",
      icon: Truck,
      desc: "Standard ground transport",
      tag: "Economical"
    },
    {
      value: "Air",
      title: "Air",
      icon: Plane,
      desc: "Express flight delivery",
      tag: "Fast"
    },
    {
      value: "Prime",
      title: "Prime",
      icon: Zap,
      desc: "Priority hand-off & delivery",
      tag: "Priority"
    }
  ];

  useEffect(() => {
    if (isOpen) {
      setSelectedServiceType("");
    }
  }, [isOpen]);

  const handleApplyAndShip = () => {
    if (!selectedServiceType) {
      toast.error("Please select a service type.");
      return;
    }

    onConfirm({
      serviceType: selectedServiceType
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
      
      {/* ================= MODAL CONTAINER ================= */}
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* ================= HEADER ================= */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="space-y-0.5">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Select Service Type
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Processing <span className="text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">{selectedOrdersCount} selected shipments</span>
            </p>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= CONTENT ================= */}
        <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {serviceTypes.map((service) => {
              const selected = selectedServiceType === service.value;
              const Icon = service.icon;

              return (
                <div
                  key={service.value}
                  onClick={() => setSelectedServiceType(service.value)}
                  className={`group relative cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200 ease-out flex flex-col justify-between ${
                    selected
                      ? "bg-gradient-to-b from-indigo-600 to-indigo-700 border-indigo-600 text-white shadow-lg shadow-indigo-600/25 translate-y-[-2px]"
                      : "bg-white border-slate-200/80 hover:border-indigo-300 hover:shadow-md text-slate-700"
                  }`}
                >
                  <div>
                    {/* Top row with icon & selection mark */}
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2.5 rounded-xl transition-colors ${
                        selected 
                          ? "bg-white/15 text-white" 
                          : "bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600"
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      {selected ? (
                        <CheckCircle2 className="w-5 h-5 text-white fill-white/20" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300 group-hover:border-indigo-400" />
                      )}
                    </div>

                    {/* Service info */}
                    <h3 className={`font-bold text-base tracking-tight ${selected ? "text-white" : "text-slate-900"}`}>
                      {service.title}
                    </h3>
                    <p className={`text-[11px] mt-1 line-clamp-2 leading-relaxed ${
                      selected ? "text-indigo-100" : "text-slate-500"
                    }`}>
                      {service.desc}
                    </p>
                  </div>

                  {/* Tag badge */}
                  <div className="mt-4 pt-3 border-t border-slate-100/10">
                    <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      selected 
                        ? "bg-white/20 text-white" 
                        : "bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600"
                    }`}>
                      {service.tag}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= FOOTER CONTROLS ================= */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white sticky bottom-0 z-10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 font-semibold text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer active:scale-95"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApplyAndShip}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default SelectCourier;
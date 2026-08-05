import { useState, useEffect } from "react";
import {
  Truck,
  Plane,
  Zap,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Save,
  CheckCircle2,
  ShieldCheck,
  Building2,
} from "lucide-react";
import {
  getCourierPriorityAPI,
  updateCourierPriorityAPI,
} from "../api/courierAPI";
import { toast } from "react-hot-toast";


const CourierPriorityPage = () => {
  const [activeTab, setActiveTab] = useState("surface");
  const [priorityData, setPriorityData] = useState({
  service: "surface",
  priority: [],
});
  const [isSaving, setIsSaving] = useState(false);
  const [isModified, setIsModified] = useState(false);

  // Tabs metadata
  const services = [
    { id: "surface", name: "Surface", icon: Truck, color: "text-amber-600 bg-amber-50" },
    { id: "air", name: "Air", icon: Plane, color: "text-blue-600 bg-blue-50" },
    { id: "prime", name: "Prime", icon: Zap, color: "text-indigo-600 bg-indigo-50" },
  ];

  const loadPriority = async (service) => {
  try {
    const res = await getCourierPriorityAPI(service);

    if (res.success) {
      setPriorityData(res.data);
      setIsModified(false);
    }
  } catch (err) {
    toast.error("Failed to load priorities");
  }
};

useEffect(() => {
  loadPriority(activeTab);
}, [activeTab]);

  // Active list for current service
  const activeList = priorityData.priority || [];

  // Helper to update list order
  const updatePriorityList = (newList) => {
    // Re-assign explicit 1-indexed order property
    const reorderedList = newList.map((item, index) => ({
      ...item,
      order: index + 1,
    }));

    setPriorityData((prev) => ({
  ...prev,
  priority: reorderedList,
}));

setIsModified(true);
  };

  // Reorder Handlers (Move Up / Down)
  const moveItem = (index, direction) => {
    const newList = [...activeList];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newList.length) return;

    // Swap elements
    const [movedItem] = newList.splice(index, 1);
    newList.splice(targetIndex, 0, movedItem);

    updatePriorityList(newList);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData("text/plain", index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = Number(e.dataTransfer.getData("text/plain"));
    if (isNaN(dragIndex) || dragIndex === dropIndex) return;

    const newList = [...activeList];
    const [draggedItem] = newList.splice(dragIndex, 1);
    newList.splice(dropIndex, 0, draggedItem);

    updatePriorityList(newList);
  };

  // Save handler (Send payload matching Mongoose model)
  const handleSave = async () => {
  try {
    setIsSaving(true);

    const res = await updateCourierPriorityAPI(
      activeTab,
        priorityData.priority
    );

    if (res.success) {
      toast.success("Priority updated successfully");
      setIsModified(false);
    }
  } catch (err) {
    toast.error("Failed to update priorities");
  } finally {
    setIsSaving(false);
  }
};


  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* ================= PAGE HEADER ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Courier Dispatch Priorities
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Set preferred courier rankings for Surface, Air, and Prime shipping types.
            </p>
          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={handleSave}
              disabled={!isModified || isSaving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* ================= SERVICE SELECTOR TABS ================= */}
        <div className="grid grid-cols-3 gap-3">
          {services.map((svc) => {
            const Icon = svc.icon;
            const isActive = activeTab === svc.id;

            return (
              <button
                key={svc.id}
                onClick={() => {
  setActiveTab(svc.id);
}}
                className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  isActive
                    ? "bg-white border-indigo-600 shadow-md shadow-indigo-600/5 text-indigo-900"
                    : "bg-white/60 border-slate-200/80 hover:bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <div className={`p-2 rounded-xl ${svc.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Service
                  </p>
                  <p className="text-sm font-extrabold capitalize">{svc.name}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ================= PRIORITY REORDERING BOARD ================= */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Rank & Courier Name
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Actions
            </span>
          </div>

          <div className="p-4 space-y-2.5">
            {activeList.map((item, index) => (
              <div
                key={item.courierId}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className="group flex items-center justify-between p-3.5 bg-white border border-slate-200/80 hover:border-indigo-200 rounded-xl transition-all shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center gap-4">
                  {/* Drag Handle */}
                  <div className="text-slate-300 group-hover:text-slate-500 transition-colors">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Priority Number Badge */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-xs ${
                      index === 0
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : index === 1
                        ? "bg-slate-100 text-slate-700 border border-slate-200"
                        : index === 2
                        ? "bg-orange-100 text-orange-800 border border-orange-200"
                        : "bg-slate-50 text-slate-500"
                    }`}
                  >
                    #{item.order}
                  </div>

                  {/* Courier Info */}
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-bold text-slate-800">
                      {item.courierName}
                    </span>
                    {index === 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-200/50 ml-2">
                        <CheckCircle2 className="w-3 h-3" /> Preferred
                      </span>
                    )}
                  </div>
                </div>

                {/* Move Up/Down Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveItem(index, "up")}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                    title="Move Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveItem(index, "down")}
                    disabled={index === activeList.length - 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                    title="Move Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {activeList.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No couriers configured for this service type.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default CourierPriorityPage;
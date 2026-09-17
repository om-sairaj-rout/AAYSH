import { useState } from "react";
import {
  Box,
  MapPin,
  ArrowRight,
  Truck,
  Plane,
  Zap,
  RotateCcw,
  IndianRupee,
  Info,
} from "lucide-react";
import { toast } from "../utils/toast";
import {
  RATE_ZONES,
  RATE_SERVICES,
  calculateRateAPI,
  lookupPincodeZoneAPI,
} from "../api/rateAPI";

const SERVICE_ICONS = {
  surface: Truck,
  air: Plane,
  prime: Zap,
};

const SERVICE_LABELS = {
  surface: "SUR (Surface)",
  air: "AIR",
  prime: "PRIME",
};

const RateCalculator = () => {
  const [form, setForm] = useState({
    service: "surface",
    destinationPincode: "",
    zone: "",
    weight: "",
    length: "",
    breadth: "",
    height: "",
  });
  const [zoneLabel, setZoneLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePincodeLookup = async () => {
    const pincode = String(form.destinationPincode || "").trim();
    if (!pincode) {
      setZoneLabel("");
      updateField("zone", "");
      return;
    }

    try {
      const res = await lookupPincodeZoneAPI(pincode);
      updateField("zone", res.data.zone);
      setZoneLabel(res.data.zone);
    } catch {
      setZoneLabel("");
      toast.warning("Pincode not found. Please select zone manually.");
    }
  };

  const handleReset = () => {
    setForm({
      service: "surface",
      destinationPincode: "",
      zone: "",
      weight: "",
      length: "",
      breadth: "",
      height: "",
    });
    setZoneLabel("");
    setResult(null);
  };

  const handleCalculate = async () => {
    if (!form.weight || Number(form.weight) <= 0) {
      toast.validation("Please enter a valid weight");
      return;
    }

    if (!form.zone && !form.destinationPincode) {
      toast.validation("Enter destination pincode or select a zone");
      return;
    }

    try {
      setLoading(true);
      const res = await calculateRateAPI({
        service: form.service,
        weight: Number(form.weight),
        length: Number(form.length) || 0,
        breadth: Number(form.breadth) || 0,
        height: Number(form.height) || 0,
        zone: form.zone || undefined,
        destinationPincode: form.destinationPincode || undefined,
      });
      setResult(res.data);
    } catch (error) {
      setResult(null);
      toast.error(error.message || "Failed to calculate rate");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 font-medium text-sm bg-white";

  const labelClass = "text-[10px] font-bold text-slate-400 uppercase tracking-wider";

  return (
    <div className="flex flex-col gap-6 text-[#1e293b]">
      <div>
        <h1 className="text-2xl font-bold text-[#1B2B4B]">Rate Calculator</h1>
        <p className="text-sm text-slate-500 mt-1">
          Calculate shipping rates using admin-configured slabs for SUR, AIR, and PRIME.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-6">
        <div>
          <label className={labelClass}>Service</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {RATE_SERVICES.map((service) => {
              const Icon = SERVICE_ICONS[service.id];
              const isActive = form.service === service.id;
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => updateField("service", service.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    isActive
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={14} />
                  {service.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className={labelClass}>Destination Pin</label>
            <input
              type="text"
              value={form.destinationPincode}
              onChange={(e) => updateField("destinationPincode", e.target.value)}
              onBlur={handlePincodeLookup}
              className={inputClass}
              placeholder="e.g. 110001"
            />
            {zoneLabel && (
              <div className="flex items-center gap-1 mt-1 text-[10px] text-indigo-600 font-semibold">
                <MapPin size={10} />
                Zone: {zoneLabel}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Zone (manual)</label>
            <select
              value={form.zone}
              onChange={(e) => {
                updateField("zone", e.target.value);
                setZoneLabel(e.target.value);
              }}
              className={inputClass}
            >
              <option value="">Auto from pincode</option>
              {RATE_ZONES.map((zone) => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Weight</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.weight}
                onChange={(e) => updateField("weight", e.target.value)}
                className={`${inputClass} pr-10`}
                placeholder="0.00"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                Kg
              </span>
            </div>
          </div>

        </div>

        <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/40">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1B2B4B] uppercase mb-4">
            <Box size={16} />
            Dimensions (optional — for volumetric weight)
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: "length", label: "Length (cm)" },
              { key: "breadth", label: "Breadth (cm)" },
              { key: "height", label: "Height (cm)" },
            ].map((field) => (
              <div key={field.key} className="space-y-1">
                <label className={labelClass}>{field.label}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form[field.key]}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 py-3 border border-indigo-200 text-indigo-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors"
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleCalculate}
            className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Calculating..." : "Calculate Rate"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                {SERVICE_LABELS[result.service] || result.service}
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                Applicable Rate for {result.zone}
              </h3>
              <p className="text-sm text-slate-500">
                Slab: <span className="font-semibold text-slate-700">{result.slab?.name}</span>
              </p>
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                <span className="px-2 py-1 rounded-lg bg-slate-100 font-semibold">
                  Chargeable: {result.chargeableWeight} kg
                </span>
                {result.weightInfo?.volumetricWeight > 0 && (
                  <span className="px-2 py-1 rounded-lg bg-slate-100 font-semibold">
                    Volumetric: {result.weightInfo.volumetricWeight} kg
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-3xl font-bold text-slate-800">
                <IndianRupee size={24} />
                {result.rate?.total}
              </div>
              <div className="text-xs text-slate-400 font-bold mt-1">
                @{result.rate?.perKg}/kg
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-100 overflow-hidden">
            <table className="min-w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-500">Base Rate</td>
                  <td className="px-4 py-3 font-semibold text-right">₹{result.rate?.baseRate}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-500">
                    Increment ({result.rate?.incrementUnits} × slab increment)
                  </td>
                  <td className="px-4 py-3 font-semibold text-right">
                    ₹{result.rate?.incrementCharge}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-700">Total</td>
                  <td className="px-4 py-3 font-bold text-right text-indigo-700">
                    ₹{result.rate?.total}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-4">
            <Info size={12} />
            Rates are calculated from admin-configured slabs. Chargeable weight uses max(actual, volumetric).
          </p>
        </div>
      )}
    </div>
  );
};

export default RateCalculator;

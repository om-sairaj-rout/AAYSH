import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { getCompanies } from "../api/companyAPI";
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
import { hasGlobalDataAccess } from "../utils/permissions";
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
  const { user } = useSelector((state) => state.auth);
  const isAdmin = hasGlobalDataAccess(user);
  const [companies, setCompanies] = useState([]);
  const [companyID, setCompanyID] = useState("");
  const [form, setForm] = useState({
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

  const effectiveCompanyID = useMemo(
    () => (isAdmin ? companyID : user?.companyID || ""),
    [isAdmin, companyID, user?.companyID]
  );

  useEffect(() => {
    if (!isAdmin) {
      setCompanyID(user?.companyID || "");
      return;
    }
    getCompanies()
      .then((res) => {
        const list = res.companies || res.data?.companies || res.data || [];
        setCompanies(Array.isArray(list) ? list : []);
        if (!companyID && user?.companyID) {
          setCompanyID(user.companyID);
        } else if (!companyID && list.length > 0) {
          setCompanyID(list[0].companyID);
        }
      })
      .catch(() => setCompanies([]));
  }, [isAdmin, user?.companyID]);

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
    if (!effectiveCompanyID) {
      toast.validation(
        isAdmin
          ? "Select a company to use its Rate Management slabs"
          : "Your account is not linked to a company"
      );
      return;
    }

    if (!form.weight || Number(form.weight) <= 0) {
      toast.validation("Please enter a valid weight");
      return;
    }

    if (!form.zone && !form.destinationPincode) {
      toast.validation("Enter destination pincode or select a zone");
      return;
    }

    const payload = {
      companyID: effectiveCompanyID,
      weight: Number(form.weight),
      length: Number(form.length) || 0,
      breadth: Number(form.breadth) || 0,
      height: Number(form.height) || 0,
      zone: form.zone || undefined,
      destinationPincode: form.destinationPincode || undefined,
      paymentMethod: "COD",
      invoiceValue: 0,
    };

    try {
      setLoading(true);
      const modeResults = await Promise.all(
        RATE_SERVICES.map(async (service) => {
          try {
            const res = await calculateRateAPI({
              ...payload,
              service: service.id,
            });
            return {
              service: service.id,
              label: service.label,
              success: true,
              data: res.data,
            };
          } catch (error) {
            return {
              service: service.id,
              label: service.label,
              success: false,
              message: error.message || "Calculation failed",
            };
          }
        })
      );

      const anySuccess = modeResults.some((row) => row.success);
      if (!anySuccess) {
        setResult(null);
        toast.error(modeResults[0]?.message || "Failed to calculate rates for any mode");
        return;
      }

      const firstOk = modeResults.find((row) => row.success)?.data;
      setResult({
        zone: firstOk?.zone,
        zoneSource: firstOk?.zoneSource,
        chargeableWeight: firstOk?.chargeableWeight,
        weightInfo: firstOk?.weightInfo,
        companyID: firstOk?.companyID || effectiveCompanyID,
        modes: modeResults,
      });
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
          {isAdmin
            ? "Calculate SUR, AIR, and PRIME rates from the selected company's Rate Management slabs."
            : "Calculate SUR, AIR, and PRIME rates using your company's configured slabs."}
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-6">
        {isAdmin && (
          <div className="space-y-1 max-w-md">
            <label className={labelClass}>Company</label>
            <select
              value={companyID}
              onChange={(e) => setCompanyID(e.target.value)}
              className={inputClass}
            >
              <option value="">Select company</option>
              {companies.map((company) => (
                <option key={company.companyID} value={company.companyID}>
                  {company.companyName} ({company.companyID})
                </option>
              ))}
            </select>
          </div>
        )}

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
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-5">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-800">
              Applicable rates for {result.zone}
            </h3>
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {result.modes.map((mode) => {
              const Icon = SERVICE_ICONS[mode.service];
              if (!mode.success) {
                return (
                  <div
                    key={mode.service}
                    className="rounded-xl border border-rose-100 bg-rose-50/50 p-4"
                  >
                    <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                      {Icon && <Icon size={14} />}
                      {SERVICE_LABELS[mode.service] || mode.label}
                    </div>
                    <p className="text-sm text-rose-700">{mode.message}</p>
                  </div>
                );
              }

              const data = mode.data;
              const breakdown = data.breakdown || {};
              const orderAmount =
                breakdown.subtotalBeforeFuel ??
                breakdown.finalRate ??
                data.rate?.total;
              const freightSlab = breakdown.weightSlabRate ?? data.rate?.total;

              return (
                <div
                  key={mode.service}
                  className="rounded-xl border border-slate-100 p-4 flex flex-col gap-3"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold w-fit">
                    {Icon && <Icon size={14} />}
                    {SERVICE_LABELS[mode.service] || mode.label}
                  </div>
                  <p className="text-xs text-slate-500">
                    Slab: <span className="font-semibold text-slate-700">{data.slab?.name}</span>
                  </p>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Order amount (incl. charges)
                    </p>
                    <div className="flex items-center gap-1 text-2xl font-bold text-indigo-700">
                      <IndianRupee size={20} />
                      {orderAmount}
                    </div>
                    {breakdown.fuelSurcharge > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        With fuel ({breakdown.fuelSurchargePercent}%): ₹
                        {breakdown.finalRate}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-bold">
                    Freight slab: ₹{freightSlab}
                    {data.rate?.perKg != null ? ` · @${data.rate.perKg}/kg` : ""}
                  </p>
                  <div className="mt-auto rounded-lg border border-slate-100 overflow-hidden text-sm">
                    <table className="min-w-full">
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="px-3 py-2 text-slate-500">Weight slab</td>
                          <td className="px-3 py-2 font-semibold text-right">
                            ₹{breakdown.weightSlabRate ?? data.rate?.total}
                          </td>
                        </tr>
                        {breakdown.codCharge > 0 && (
                          <tr className="border-b border-slate-100">
                            <td className="px-3 py-2 text-slate-500">COD</td>
                            <td className="px-3 py-2 font-semibold text-right">
                              ₹{breakdown.codCharge}
                            </td>
                          </tr>
                        )}
                        {breakdown.docCharge > 0 && (
                          <tr className="border-b border-slate-100">
                            <td className="px-3 py-2 text-slate-500">Document</td>
                            <td className="px-3 py-2 font-semibold text-right">
                              ₹{breakdown.docCharge}
                            </td>
                          </tr>
                        )}
                        {breakdown.rovCharge > 0 && (
                          <tr className="border-b border-slate-100">
                            <td className="px-3 py-2 text-slate-500">ROV</td>
                            <td className="px-3 py-2 font-semibold text-right">
                              ₹{breakdown.rovCharge}
                            </td>
                          </tr>
                        )}
                        {breakdown.fuelSurcharge > 0 && (
                          <tr className="border-b border-slate-100">
                            <td className="px-3 py-2 text-slate-500">
                              Fuel ({breakdown.fuelSurchargePercent}%)
                            </td>
                            <td className="px-3 py-2 font-semibold text-right">
                              ₹{breakdown.fuelSurcharge}
                            </td>
                          </tr>
                        )}
                        <tr>
                          <td className="px-3 py-2 font-bold text-slate-700">Order amount</td>
                          <td className="px-3 py-2 font-bold text-right text-indigo-700">
                            ₹{orderAmount}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <Info size={12} />
            Order amount matches invoice line totals (freight + COD + document + ROV). Fuel is
            shown separately when configured. Chargeable weight uses max(actual, volumetric). COD
            assumed; ROV applies only when enabled and invoice value is provided.
          </p>
        </div>
      )}
    </div>
  );
};

export default RateCalculator;

import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Truck,
  Plane,
  Zap,
  Plus,
  Save,
  Trash2,
  ArrowUp,
  ArrowDown,
  IndianRupee,
} from "lucide-react";
import { canAccess } from "../utils/permissions";
import { toast } from "../utils/toast";
import { getCompanies } from "../api/companyAPI";
import {
  RATE_ZONES,
  RATE_SERVICES,
  buildEmptySlab,
  getCompanyRateProfileAPI,
  updateCompanyRateProfileAPI,
  getCompanyRateStructureAPI,
  updateCompanyRateStructureAPI,
} from "../api/rateAPI";

const SERVICE_ICONS = {
  surface: Truck,
  air: Plane,
  prime: Zap,
};

const RateManagementPage = () => {
  const { user } = useSelector((state) => state.auth);
  const canWrite = canAccess(user, "update", "write");
  const [activeService, setActiveService] = useState("surface");
  const [slabs, setSlabs] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyID, setSelectedCompanyID] = useState("");
  const [profile, setProfile] = useState({
    rovIncluded: false,
    docChargeBelow3kg: 0,
    docChargeAbove3kg: 0,
    docChargePrime: 0,
    fuelSurchargePercent: 0,
  });
  const [profileModified, setProfileModified] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const selectedSlab = slabs[selectedIndex] || null;

  useEffect(() => {
    getCompanies()
      .then((res) => {
        const list = res.companies || res.data || [];
        setCompanies(list);
        if (!selectedCompanyID && list.length > 0) {
          setSelectedCompanyID(list[0].companyID);
        }
      })
      .catch(() => setCompanies([]));
  }, []);

  const loadRates = async (service, companyID) => {
    if (!companyID) {
      setSlabs([]);
      setSelectedIndex(-1);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [rateRes, profileRes] = await Promise.all([
        getCompanyRateStructureAPI(companyID, service),
        getCompanyRateProfileAPI(companyID),
      ]);
      const nextSlabs = rateRes.data?.slabs || [];
      setSlabs(nextSlabs);
      setProfile(profileRes.data?.profile || profile);
      setSelectedIndex(nextSlabs.length > 0 ? 0 : -1);
      setIsModified(false);
      setProfileModified(false);
    } catch (error) {
      toast.error(error.message || "Failed to load rate structure");
      setSlabs([]);
      setSelectedIndex(-1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRates(activeService, selectedCompanyID);
  }, [activeService, selectedCompanyID]);

  const updateSlabs = (nextSlabs) => {
    setSlabs(nextSlabs);
    setIsModified(true);
  };

  const updateSelectedSlab = (patch) => {
    if (selectedIndex < 0) return;
    const next = [...slabs];
    next[selectedIndex] = { ...next[selectedIndex], ...patch };
    updateSlabs(next);
  };

  const updateZoneRate = (zone, field, value) => {
    if (!selectedSlab) return;
    updateSelectedSlab({
      zoneRates: {
        ...selectedSlab.zoneRates,
        [zone]: {
          ...selectedSlab.zoneRates[zone],
          [field]: value,
        },
      },
    });
  };

  const handleAddSlab = () => {
    const next = [...slabs, buildEmptySlab(slabs.length)];
    updateSlabs(next);
    setSelectedIndex(next.length - 1);
  };

  const handleDeleteSlab = (index) => {
    const next = slabs.filter((_, i) => i !== index).map((slab, i) => ({
      ...slab,
      sortOrder: i,
    }));
    updateSlabs(next);
    setSelectedIndex(Math.min(index, next.length - 1));
  };

  const moveSlab = (index, direction) => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= slabs.length) return;
    const next = [...slabs];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    updateSlabs(next.map((slab, i) => ({ ...slab, sortOrder: i })));
    setSelectedIndex(target);
  };

  const handleSave = async () => {
    if (!canWrite) return;
    if (!selectedCompanyID) {
      toast.validation("Select a company");
      return;
    }

    for (const [index, slab] of slabs.entries()) {
      if (!String(slab.name || "").trim()) {
        toast.validation(`Slab ${index + 1}: name is required`);
        setSelectedIndex(index);
        return;
      }
    }

    try {
      setSaving(true);
      const payload = slabs.map((slab, index) => ({
        ...slab,
        sortOrder: index,
        maxWeight:
          slab.maxWeight === "" || slab.maxWeight === undefined
            ? null
            : Number(slab.maxWeight),
      }));
      const res = await updateCompanyRateStructureAPI(
        selectedCompanyID,
        activeService,
        payload
      );
      setSlabs(res.data?.slabs || payload);
      setIsModified(false);
      toast.success("Rate structure saved successfully");
    } catch (error) {
      toast.error(error.message || "Failed to save rate structure");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!canWrite || !selectedCompanyID) return;
    try {
      setSavingProfile(true);
      await updateCompanyRateProfileAPI(selectedCompanyID, profile);
      setProfileModified(false);
      toast.success("Company charge settings saved");
    } catch (error) {
      toast.error(error.message || "Failed to save company profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const updateProfileField = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setProfileModified(true);
  };

  const serviceLabel = useMemo(
    () => RATE_SERVICES.find((item) => item.id === activeService)?.label || "",
    [activeService]
  );

  const inputClass =
    "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B4B]">Rate Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure per-company weight slabs, ROV, DOC, and fuel surcharge.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canWrite && selectedCompanyID && (
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={savingProfile || !profileModified}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold disabled:opacity-50"
            >
              <Save size={16} />
              {savingProfile ? "Saving..." : "Save Charges"}
            </button>
          )}
          {canWrite && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isModified}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Slabs"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
            Company
          </label>
          <select
            value={selectedCompanyID}
            onChange={(e) => setSelectedCompanyID(e.target.value)}
            className={inputClass}
          >
            <option value="">Select company</option>
            {companies.map((company) => (
              <option key={company.companyID} value={company.companyID}>
                {company.companyName} ({company.companyID})
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Rates apply only to the selected company. Add slabs here before billing.
          </p>
        </div>

        {selectedCompanyID && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                ROV
              </label>
              <select
                disabled={!canWrite}
                value={profile.rovIncluded ? "included" : "not_included"}
                onChange={(e) =>
                  updateProfileField("rovIncluded", e.target.value === "included")
                }
                className={inputClass}
              >
                <option value="not_included">Not Included</option>
                <option value="included">Included (0.3% of invoice value)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Fuel Surcharge (%)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                disabled={!canWrite}
                value={profile.fuelSurchargePercent}
                onChange={(e) =>
                  updateProfileField("fuelSurchargePercent", e.target.value)
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                DOC — Below 3 kg (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                disabled={!canWrite}
                value={profile.docChargeBelow3kg}
                onChange={(e) => updateProfileField("docChargeBelow3kg", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                DOC — Above 3 kg (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                disabled={!canWrite}
                value={profile.docChargeAbove3kg}
                onChange={(e) => updateProfileField("docChargeAbove3kg", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                DOC — Prime (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                disabled={!canWrite}
                value={profile.docChargePrime}
                onChange={(e) => updateProfileField("docChargePrime", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {RATE_SERVICES.map((service) => {
          const Icon = SERVICE_ICONS[service.id];
          const isActive = activeService === service.id;
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => setActiveService(service.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Icon size={16} />
              {service.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-500">
          Loading {serviceLabel} rates...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/70">
              <h2 className="text-sm font-bold text-[#1B2B4B]">Weight Slabs</h2>
              {canWrite && (
                <button
                  type="button"
                  onClick={handleAddSlab}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100"
                >
                  <Plus size={14} />
                  Add
                </button>
              )}
            </div>

            <div className="max-h-[640px] overflow-y-auto divide-y divide-slate-100">
              {slabs.length === 0 ? (
                <div className="p-6 text-sm text-slate-500 text-center">
                  No slabs configured yet. Add your first weight category.
                </div>
              ) : (
                slabs.map((slab, index) => (
                  <div
                    key={slab.id || index}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedIndex === index ? "bg-indigo-50/70" : "hover:bg-slate-50"
                    }`}
                    onClick={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-sm text-slate-800">
                          {slab.name || `Slab ${index + 1}`}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {slab.minWeight}–{slab.maxWeight ?? "∞"} kg · Base {slab.baseWeight} kg
                        </div>
                      </div>
                      {canWrite && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveSlab(index, "up");
                            }}
                            className="p-1 rounded hover:bg-white text-slate-400"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveSlab(index, "down");
                            }}
                            className="p-1 rounded hover:bg-white text-slate-400"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSlab(index);
                            }}
                            className="p-1 rounded hover:bg-rose-50 text-rose-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-6">
            {!selectedSlab ? (
              <div className="text-sm text-slate-500 text-center py-16">
                Select a weight slab to edit its details and zone rates.
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-sm font-bold text-[#1B2B4B] mb-4">Slab Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        Category Name
                      </label>
                      <input
                        value={selectedSlab.name}
                        disabled={!canWrite}
                        onChange={(e) => updateSelectedSlab({ name: e.target.value })}
                        placeholder="e.g. Below 1 kg Doc"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        Active
                      </label>
                      <select
                        value={selectedSlab.isActive ? "yes" : "no"}
                        disabled={!canWrite}
                        onChange={(e) =>
                          updateSelectedSlab({ isActive: e.target.value === "yes" })
                        }
                        className={inputClass}
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        Min Weight (kg)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={!canWrite}
                        value={selectedSlab.minWeight}
                        onChange={(e) => updateSelectedSlab({ minWeight: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        Max Weight (kg)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={!canWrite}
                        value={selectedSlab.maxWeight ?? ""}
                        onChange={(e) =>
                          updateSelectedSlab({
                            maxWeight: e.target.value === "" ? null : e.target.value,
                          })
                        }
                        placeholder="Leave empty for no limit"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        Base Weight (kg)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={!canWrite}
                        value={selectedSlab.baseWeight}
                        onChange={(e) => updateSelectedSlab({ baseWeight: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        Increment Step (kg)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={!canWrite}
                        value={selectedSlab.incrementStep}
                        onChange={(e) => updateSelectedSlab({ incrementStep: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <IndianRupee size={16} className="text-indigo-600" />
                    <h2 className="text-sm font-bold text-[#1B2B4B]">Zone Rates</h2>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-left">
                        <tr>
                          <th className="px-4 py-3 font-bold text-slate-600">Zone</th>
                          <th className="px-4 py-3 font-bold text-slate-600">Base Rate (₹)</th>
                          <th className="px-4 py-3 font-bold text-slate-600">
                            Increment Rate (₹)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {RATE_ZONES.map((zone) => (
                          <tr key={zone} className="border-t border-slate-100">
                            <td className="px-4 py-3 font-medium text-slate-700">{zone}</td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                disabled={!canWrite}
                                value={selectedSlab.zoneRates?.[zone]?.baseRate ?? 0}
                                onChange={(e) =>
                                  updateZoneRate(zone, "baseRate", e.target.value)
                                }
                                className={inputClass}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                disabled={!canWrite}
                                value={selectedSlab.zoneRates?.[zone]?.incrementRate ?? 0}
                                onChange={(e) =>
                                  updateZoneRate(zone, "incrementRate", e.target.value)
                                }
                                className={inputClass}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    Rate = Base Rate + ceiling((Chargeable Weight − Base Weight) / Increment Step) × Increment Rate
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RateManagementPage;

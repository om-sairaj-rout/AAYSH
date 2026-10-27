import { useEffect, useState } from "react";

import { useSelector } from "react-redux";

import { FileSpreadsheet, MapPin, UploadCloud } from "lucide-react";

import { canAccess } from "../utils/permissions";

import { toast } from "../utils/toast";

import {

  getPincodeZoneSummary,

  previewPincodeZoneImport,

  importPincodeZone,

} from "../api/pincodeZoneAPI";



const PincodeZoneManagementPage = () => {

  const { user } = useSelector((state) => state.auth);

  const canWrite = canAccess(user, "update", "write");



  const [zones, setZones] = useState([]);

  const [countsByZone, setCountsByZone] = useState({});

  const [selectedZone, setSelectedZone] = useState("");

  const [file, setFile] = useState(null);

  const [columnIndex, setColumnIndex] = useState("");

  const [preview, setPreview] = useState(null);

  const [loading, setLoading] = useState(false);



  const loadSummary = async () => {

    try {

      const res = await getPincodeZoneSummary();

      setZones(res.zones || []);

      setCountsByZone(res.countsByZone || {});

      if (!selectedZone && res.zones?.length) {

        setSelectedZone(res.zones[0]);

      }

    } catch (error) {

      toast.error(error.message);

    }

  };



  useEffect(() => {

    loadSummary();

  }, []);



  const handlePreview = async (e) => {

    e.preventDefault();

    if (!canWrite) return;

    if (!selectedZone || !file) {

      toast.error("Select a zone and Excel file.");

      return;

    }

    try {

      setLoading(true);

      const res = await previewPincodeZoneImport({

        zone: selectedZone,

        file,

        columnIndex: columnIndex === "" ? undefined : Number(columnIndex),

      });

      setPreview(res);

      if (res.canImport) {

        toast.success("Preview ready — confirm import below.");

      }

    } catch (error) {

      toast.error(error.message);

      setPreview(null);

    } finally {

      setLoading(false);

    }

  };



  const handleImport = async () => {

    if (!canWrite || !preview?.canImport || !file) return;

    try {

      setLoading(true);

      const res = await importPincodeZone({

        zone: selectedZone,

        file,

        columnIndex: columnIndex === "" ? undefined : Number(columnIndex),

      });

      const s = res.summary || {};

      toast.success(

        res.message ||

          `Added ${s.added}, reassigned ${s.reassigned}, unchanged ${s.unchanged}`

      );

      setPreview(null);

      setFile(null);

      await loadSummary();

    } catch (error) {

      toast.error(error.message);

    } finally {

      setLoading(false);

    }

  };



  return (

    <div className="p-6 max-w-5xl mx-auto space-y-6">

      <div>

        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">

          <MapPin className="w-5 h-5 text-indigo-600" />

          Pincode Zone Management

        </h1>

        <p className="text-sm text-slate-500 mt-1">
          Upload headerless Excel files (pincodes only). Assign Local NCR, North Zone,
          Metro, or North East. Any other valid pincode is treated as Rest of India for
          rates and AWB (not managed here).
        </p>

      </div>



      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

        {zones.map((zone) => (

          <div

            key={zone}

            className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm"

          >

            <p className="text-xs font-bold uppercase text-slate-400">{zone}</p>

            <p className="text-2xl font-mono font-bold text-slate-800 mt-1">

              {(countsByZone[zone] || 0).toLocaleString("en-IN")}

            </p>

            <p className="text-[11px] text-slate-400">mapped pincodes</p>

          </div>

        ))}

      </div>



      <form

        onSubmit={handlePreview}

        className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4"

      >

        <h2 className="text-sm font-black uppercase text-slate-700 tracking-wider">

          Upload zone file

        </h2>



        <label className="block text-xs font-semibold text-slate-500">

          Target zone

          <select

            value={selectedZone}

            onChange={(e) => setSelectedZone(e.target.value)}

            className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"

            required

          >

            {zones.map((z) => (

              <option key={z} value={z}>{z}</option>

            ))}

          </select>

        </label>



        <label className="block text-xs font-semibold text-slate-500">

          Pincode column index (only if file has multiple data columns)

          <input

            type="number"

            min={0}

            value={columnIndex}

            onChange={(e) => setColumnIndex(e.target.value)}

            placeholder="Auto-detect"

            className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"

          />

        </label>



        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center relative">

          <input

            type="file"

            accept=".xlsx,.xls,.csv"

            onChange={(e) => {

              setFile(e.target.files?.[0] || null);

              setPreview(null);

            }}

            className="absolute inset-0 opacity-0 cursor-pointer"

            required

          />

          <UploadCloud className="w-8 h-8 mx-auto text-slate-400 mb-2" />

          <p className="text-sm font-semibold text-slate-700">

            {file ? file.name : "Choose .xlsx / .xls (no header row required)"}

          </p>

        </div>



        <button

          type="submit"

          disabled={loading || !canWrite}

          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"

        >

          <FileSpreadsheet className="w-4 h-4" />

          {loading ? "Processing…" : "Preview import"}

        </button>

      </form>



      {preview?.preview && (

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-3 text-sm">

          <h3 className="font-bold text-slate-800">Preview — {preview.preview.zone}</h3>

          <ul className="grid grid-cols-2 gap-2 text-slate-600">

            <li>Valid pincodes: <strong>{preview.preview.totalValid}</strong></li>

            <li>Added: <strong>{preview.preview.addedCount}</strong></li>

            <li>Reassigned: <strong>{preview.preview.reassignedCount}</strong></li>

            <li>Unchanged: <strong>{preview.preview.unchangedCount}</strong></li>

            <li>Invalid: <strong>{preview.preview.invalidCount}</strong></li>

            <li>Duplicates in file: <strong>{preview.preview.duplicatesInFileCount}</strong></li>

          </ul>

          {preview.preview.reassignedSample?.length > 0 && (

            <p className="text-amber-800 text-xs">

              Sample reassignments:{" "}

              {preview.preview.reassignedSample

                .slice(0, 5)

                .map((c) => `${c.pincode} (${c.fromZone} → ${c.toZone})`)

                .join(", ")}

            </p>

          )}

          {preview.canImport && canWrite && (

            <button

              type="button"

              onClick={handleImport}

              disabled={loading}

              className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-sm"

            >

              Confirm import

            </button>

          )}

        </div>

      )}

    </div>

  );

};



export default PincodeZoneManagementPage;


import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { canAccess } from "../utils/permissions";
import {
  bulkFetchDelhiveryAwbsAPI,
  fetchDelhiveryAwbPoolStatus,
  listDelhiveryAwbsAPI,
  singleFetchDelhiveryAwbAPI,
  triggerDelhiveryAwbReplenishAPI,
} from "../api/delhiveryAwbAPI";
import { toast } from "../utils/toast";
import { Package, RefreshCw, Download, PlusCircle, Search } from "lucide-react";

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const DelhiveryAwbManagement = () => {
  const { user } = useSelector((state) => state.auth);
  const canWrite = canAccess(user, "update", "write");

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [awbs, setAwbs] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total: 0,
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [bulkCount, setBulkCount] = useState("5");
  const [actionLoading, setActionLoading] = useState(false);

  const loadStatus = useCallback(async () => {
    const res = await fetchDelhiveryAwbPoolStatus();
    setStatus(res);
  }, []);

  const loadAwbs = useCallback(
    async (page = 1) => {
      const res = await listDelhiveryAwbsAPI({
        status: statusFilter,
        search: appliedSearch,
        page,
        perPage: 50,
      });
      setAwbs(res.data || []);
      setPagination(res.pagination || { current_page: page, total_pages: 1 });
    },
    [statusFilter, appliedSearch]
  );

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadStatus(), loadAwbs(pagination.current_page)]);
    } catch (err) {
      toast.error(err.message || "Failed to load Delhivery AWB pool");
    } finally {
      setLoading(false);
    }
  }, [loadStatus, loadAwbs, pagination.current_page]);

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    loadAwbs(1).catch((err) =>
      toast.error(err.message || "Failed to list AWBs")
    );
  }, [statusFilter, appliedSearch, loadAwbs]);

  const runBulkFetch = async () => {
    const count = Number(bulkCount);
    if (!Number.isFinite(count) || count < 1 || count > 10000) {
      toast.error("Bulk count must be between 1 and 10000");
      return;
    }
    if (
      !window.confirm(`Fetch ${count} Delhivery AWB(s) from the API and save them?`)
    ) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await bulkFetchDelhiveryAwbsAPI(count);
      toast.success(
        `Saved ${res.store?.saved ?? 0} AWB(s) (${res.store?.duplicates ?? 0} duplicates skipped)`
      );
      await refreshAll();
    } catch (err) {
      toast.error(err.message || "Bulk fetch failed");
    } finally {
      setActionLoading(false);
    }
  };

  const runSingleFetch = async () => {
    if (!window.confirm("Fetch one Delhivery AWB from the API?")) return;
    setActionLoading(true);
    try {
      const res = await singleFetchDelhiveryAwbAPI();
      toast.success(
        res.store?.saved
          ? `AWB saved: ${res.api?.awbNumbers?.[0] || "ok"}`
          : "No new AWB saved (duplicate or invalid)"
      );
      await refreshAll();
    } catch (err) {
      toast.error(err.message || "Single fetch failed");
    } finally {
      setActionLoading(false);
    }
  };

  const runReplenishCheck = async () => {
    setActionLoading(true);
    try {
      const res = await triggerDelhiveryAwbReplenishAPI();
      if (res.skipped) {
        toast.info(res.reason || res.message || "Replenishment not needed");
      } else if (res.success) {
        toast.success(`Replenished: ${res.store?.saved ?? 0} AWB(s) saved`);
      } else {
        toast.error(res.message || "Replenishment failed");
      }
      await refreshAll();
    } catch (err) {
      toast.error(err.message || "Replenishment check failed");
    } finally {
      setActionLoading(false);
    }
  };

  const counts = status?.counts || {};
  const rep = status?.replenishment || {};
  const history = status?.fetch_history || [];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Package className="w-7 h-7" />
          Delhivery AWB Pool
        </h1>
        <button
          type="button"
          onClick={refreshAll}
          disabled={loading || actionLoading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Available" value={counts.available ?? "—"} highlight />
        <StatCard label="Used / assigned" value={counts.used_or_assigned ?? "—"} />
        <StatCard label="Reserved" value={counts.reserved ?? "—"} />
        <StatCard label="Total" value={counts.total ?? "—"} />
      </div>

      <section className="rounded-lg border p-4 space-y-3 bg-white shadow-sm">
        <h2 className="font-medium text-lg">Automatic replenishment</h2>
        <dl className="grid sm:grid-cols-2 gap-2 text-sm">
          <Row label="Enabled" value={status?.auto_replenish_enabled ? "Yes" : "No"} />
          <Row
            label="Rule"
            value={`When available < ${status?.replenish_threshold ?? 20}, fetch ${status?.replenish_batch_size ?? 50}`}
          />
          <Row label="Currently running" value={rep.running ? "Yes" : "No"} />
          <Row label="Last status" value={rep.last_status || "—"} />
          <Row label="Last success" value={formatDate(rep.last_at)} />
          <Row label="Last requested" value={rep.last_requested ?? "—"} />
          <Row label="Last saved" value={rep.last_saved ?? "—"} />
          <Row
            label="Last error"
            value={rep.last_error || "—"}
            className="text-red-600 break-words"
          />
        </dl>
        {canWrite && (
          <button
            type="button"
            onClick={runReplenishCheck}
            disabled={actionLoading}
            className="text-sm px-3 py-2 rounded-md bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50"
          >
            Run replenishment check now
          </button>
        )}
      </section>

      {canWrite && (
        <section className="rounded-lg border p-4 space-y-3 bg-white shadow-sm">
          <h2 className="font-medium text-lg">Manual fetch</h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm flex flex-col gap-1">
              Bulk count (1–10000)
              <input
                type="number"
                min={1}
                max={10000}
                value={bulkCount}
                onChange={(e) => setBulkCount(e.target.value)}
                className="border rounded px-2 py-1 w-32"
              />
            </label>
            <button
              type="button"
              onClick={runBulkFetch}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Bulk fetch
            </button>
            <button
              type="button"
              onClick={runSingleFetch}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              Fetch single AWB
            </button>
          </div>
        </section>
      )}

      <section className="rounded-lg border p-4 bg-white shadow-sm space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="assigned">Assigned</option>
            <option value="used">Used</option>
            <option value="booked">Booked</option>
            <option value="failed">Failed</option>
          </select>
          <div className="flex items-center gap-1 border rounded px-2 py-1 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="search"
              placeholder="Search AWB"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setAppliedSearch(searchInput.trim());
              }}
              className="flex-1 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => setAppliedSearch(searchInput.trim())}
              className="text-sm text-blue-600"
            >
              Search
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-600">
                <th className="py-2 pr-2">AWB</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 pr-2">Source</th>
                <th className="py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {awbs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-500">
                    {loading ? "Loading…" : "No AWBs found"}
                  </td>
                </tr>
              ) : (
                awbs.map((row) => (
                  <tr key={row._id} className="border-b last:border-0">
                    <td className="py-2 pr-2 font-mono">{row.awbNumber}</td>
                    <td className="py-2 pr-2 capitalize">{row.status}</td>
                    <td className="py-2 pr-2">{row.source}</td>
                    <td className="py-2">{formatDate(row.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.total_pages > 1 && (
          <div className="flex justify-between items-center text-sm">
            <span>
              Page {pagination.current_page} of {pagination.total_pages} (
              {pagination.total} total)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.current_page <= 1}
                onClick={() => loadAwbs(pagination.current_page - 1)}
                className="px-2 py-1 border rounded disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={pagination.current_page >= pagination.total_pages}
                onClick={() => loadAwbs(pagination.current_page + 1)}
                className="px-2 py-1 border rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section className="rounded-lg border p-4 bg-white shadow-sm">
          <h2 className="font-medium text-lg mb-3">Recent fetch history</h2>
          <ul className="space-y-2 text-sm max-h-64 overflow-y-auto">
            {history.map((h, i) => (
              <li key={i} className="border-b pb-2 last:border-0">
                <span className="font-medium">{formatDate(h.at)}</span>
                {" · "}
                {h.trigger} · requested {h.requested}, saved {h.saved}
                {h.duplicates ? `, dup ${h.duplicates}` : ""}
                {h.status === "failed" && (
                  <span className="text-red-600 block">{h.error}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

const StatCard = ({ label, value, highlight }) => (
  <div
    className={`rounded-lg border p-3 ${
      highlight ? "border-green-300 bg-green-50" : "bg-white"
    }`}
  >
    <div className="text-xs text-gray-500">{label}</div>
    <div className="text-xl font-semibold">{value}</div>
  </div>
);

const Row = ({ label, value, className = "" }) => (
  <div>
    <span className="text-gray-500">{label}: </span>
    <span className={className}>{value}</span>
  </div>
);

export default DelhiveryAwbManagement;

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Building2,
  ShieldCheck,
  UserCircle,
  Search,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { getRegistrationStats, migrateLegacyCompanies } from "../api/authAPI";
import { formatDisplayDate } from "../utils/dateTime";
import { toast } from "react-hot-toast";

const StatCard = ({ icon: Icon, label, value, hint, tone = "text-[#1B2B4B]", onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`bg-white rounded-[20px] p-5 shadow-[0_8px_30px_rgba(27,43,75,0.06)] border border-white text-left w-full transition-all ${
      onClick ? "hover:shadow-lg hover:-translate-y-0.5 cursor-pointer" : ""
    }`}
  >
    <div className="w-10 h-10 rounded-xl bg-[#F4F6FA] flex items-center justify-center text-[#1B2B4B] mb-4">
      <Icon size={20} />
    </div>
    <p className={`text-3xl font-black ${tone}`}>{value}</p>
    <p className="text-xs font-semibold text-slate-400 mt-1">{label}</p>
    {hint && <p className="text-[11px] text-slate-400 mt-2">{hint}</p>}
  </button>
);

const RegistrationOverviewPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCompanies: 0,
    adminUsers: 0,
    companyUsers: 0,
    usersWithoutCompanyId: 0,
  });
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const companiesRef = useRef(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await getRegistrationStats();
      setStats(res.stats || {});
      setCompanies(res.companies || []);
      setUsers(res.users || []);
    } catch (error) {
      toast.error(error.message || "Failed to load registration overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleMigrate = async () => {
    try {
      setMigrating(true);
      const res = await migrateLegacyCompanies();
      toast.success(
        `Migration done: ${res.result?.companiesCreated || 0} companies created`
      );
      await loadStats();
    } catch (error) {
      toast.error(error.message || "Migration failed");
    } finally {
      setMigrating(false);
    }
  };

  const scrollToCompanies = () => {
    companiesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const filteredCompanies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return companies;

    return companies.filter((company) =>
      [
        company.companyName,
        company.companyID,
        company.city,
        company.state,
        company.owner?.email,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [companies, searchQuery]);

  return (
    <div className="w-full min-h-full bg-[#EFF2F6] -m-4 md:-m-6 p-5 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B2B4B]">Registration Overview</h1>
        <p className="text-sm text-slate-500 mt-1">
          Track registered companies and open a company to manage its users and permissions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Users Registered"
          value={stats.totalUsers ?? 0}
          hint="All accounts in the system"
        />
        <StatCard
          icon={Building2}
          label="Companies Registered"
          value={stats.totalCompanies ?? 0}
          hint="Click to view company list"
          tone="text-indigo-600"
          onClick={scrollToCompanies}
        />
        <StatCard
          icon={UserCircle}
          label="Company User Accounts"
          value={stats.companyUsers ?? 0}
          hint="Users with role: user"
          tone="text-sky-600"
        />
        <StatCard
          icon={ShieldCheck}
          label="Admin Accounts"
          value={stats.adminUsers ?? 0}
          hint="Users with role: admin"
          tone="text-emerald-600"
        />
      </div>

      {(stats.usersWithoutCompanyId > 0 || stats.needsMigration) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p className="text-sm">
              {stats.usersWithoutCompanyId > 0
                ? `${stats.usersWithoutCompanyId} company user account(s) need a company ID.`
                : "Legacy accounts need migration to the new company system."}{" "}
              You do not need to re-register — run migration once to assign IDs and create companies.
            </p>
          </div>
          <button
            type="button"
            onClick={handleMigrate}
            disabled={migrating}
            className="shrink-0 rounded-xl bg-[#1B2B4B] text-white px-4 py-2 text-xs font-bold disabled:opacity-50"
          >
            {migrating ? "Migrating..." : "Run Migration"}
          </button>
        </div>
      )}

      <div
        ref={companiesRef}
        className="bg-white rounded-[22px] shadow-[0_8px_30px_rgba(27,43,75,0.06)] border border-white overflow-hidden"
      >
        <div className="px-5 sm:px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#1B2B4B]">Registered Companies</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {filteredCompanies.length} company record(s) shown
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company, ID, city..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-[#1B2B4B]/10 focus:border-[#1B2B4B]/30"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 bg-[#FAFBFC]">
                <th className="px-6 py-4">Company ID</th>
                <th className="px-6 py-4">Company Name</th>
                <th className="px-6 py-4">Owner</th>
                <th className="px-6 py-4">Users</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Registered On</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Loading registration data...
                  </td>
                </tr>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No registered companies found.
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company) => (
                  <tr
                    key={company.companyID}
                    onClick={() => navigate(`/user/companies/${company.companyID}`)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-600">
                      {company.companyID}
                    </td>
                    <td className="px-6 py-4 font-semibold text-[#1B2B4B]">
                      {company.companyName}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {company.owner?.fullName || company.owner?.email || "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {company.stats?.totalUsers ?? company.userCount ?? 0}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {[company.city, company.state].filter(Boolean).join(", ") || "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {company.createdAt ? formatDisplayDate(company.createdAt) : "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      <ChevronRight size={16} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RegistrationOverviewPage;

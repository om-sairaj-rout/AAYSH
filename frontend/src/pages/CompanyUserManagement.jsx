import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  UserPlus,
  Shield,
  Trash2,
  Pencil,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getCompanyDetail,
  registerCompanyUser,
  updateCompanyUser,
  deleteCompanyUser,
} from "../api/companyAPI";
import { formatDisplayDate } from "../utils/dateTime";
import {
  PERMISSION_SECTIONS,
  COMPANY_ROLES,
  buildDefaultPermissions,
} from "../utils/permissions";

const emptyForm = {
  fullName: "",
  email: "",
  password: "",
  mobile_number: "",
  companyRole: "operator",
  isOwner: false,
  permissions: buildDefaultPermissions("operator"),
};

const PermissionMatrix = ({ permissions, onChange, disabled }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200">
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50">
          <th className="px-4 py-3">Section</th>
          <th className="px-4 py-3 text-center">Read</th>
          <th className="px-4 py-3 text-center">Write</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {Object.entries(PERMISSION_SECTIONS).map(([key, meta]) => (
          <tr key={key}>
            <td className="px-4 py-3 font-medium text-[#1B2B4B]">{meta.label}</td>
            <td className="px-4 py-3 text-center">
              <input
                type="checkbox"
                disabled={disabled}
                checked={Boolean(permissions?.[key]?.read)}
                onChange={(e) =>
                  onChange(key, "read", e.target.checked)
                }
              />
            </td>
            <td className="px-4 py-3 text-center">
              <input
                type="checkbox"
                disabled={disabled}
                checked={Boolean(permissions?.[key]?.write)}
                onChange={(e) =>
                  onChange(key, "write", e.target.checked)
                }
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const RoleBadge = ({ role }) => {
  const styles = {
    owner: "bg-indigo-50 text-indigo-700",
    manager: "bg-sky-50 text-sky-700",
    operator: "bg-slate-100 text-slate-700",
    viewer: "bg-amber-50 text-amber-700",
  };
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
        styles[role] || styles.viewer
      }`}
    >
      {role}
    </span>
  );
};

const CompanyUserManagement = ({ companyID, backPath, backLabel }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadCompany = async () => {
    try {
      setLoading(true);
      const res = await getCompanyDetail(companyID);
      setData(res);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyID) loadCompany();
  }, [companyID]);

  const handlePermissionChange = (section, action, value) => {
    setForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [section]: {
          ...prev.permissions[section],
          [action]: value,
          ...(action === "write" && value ? { read: true } : {}),
        },
      },
    }));
  };

  const handleRoleChange = (companyRole) => {
    setForm((prev) => ({
      ...prev,
      companyRole,
      isOwner: companyRole === "owner",
      permissions: buildDefaultPermissions(companyRole),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingUser) {
        await updateCompanyUser(companyID, editingUser._id, {
          fullName: form.fullName,
          companyRole: form.companyRole,
          isOwner: form.isOwner,
          permissions: form.permissions,
        });
        toast.success("User updated successfully");
      } else {
        await registerCompanyUser(companyID, form);
        toast.success("User registered successfully");
      }
      setForm(emptyForm);
      setEditingUser(null);
      await loadCompany();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setForm({
      fullName: user.fullName || "",
      email: user.email,
      password: "",
      mobile_number: user.mobile_number,
      companyRole: user.companyRole,
      isOwner: user.companyRole === "owner",
      permissions: user.permissions || buildDefaultPermissions(user.companyRole),
    });
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Remove ${user.email} from this company?`)) return;
    try {
      await deleteCompanyUser(companyID, user._id);
      toast.success("User removed");
      await loadCompany();
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">Loading company details...</div>
    );
  }

  if (!data?.company) {
    return (
      <div className="p-8 text-center text-slate-400">Company not found.</div>
    );
  }

  const { company, users, stats, canManageUsers, owner } = data;

  return (
    <div className="w-full min-h-full bg-[#EFF2F6] -m-4 md:-m-6 p-5 md:p-8 space-y-6">
      <button
        type="button"
        onClick={() => navigate(backPath)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#1B2B4B]"
      >
        <ArrowLeft size={16} />
        {backLabel}
      </button>

      <div className="bg-white rounded-[22px] p-6 shadow-[0_8px_30px_rgba(27,43,75,0.06)] border border-white">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-[#F4F6FA] flex items-center justify-center text-[#1B2B4B]">
                <Building2 size={22} />
              </div>
              <div>
                <p className="font-mono text-xs font-bold text-indigo-600">
                  {company.companyID}
                </p>
                <h1 className="text-2xl font-bold text-[#1B2B4B]">
                  {company.companyName}
                </h1>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-2">
              {[company.address, company.city, company.state, company.country]
                .filter(Boolean)
                .join(", ")}
            </p>
            {owner && (
              <p className="text-xs text-slate-400 mt-2">
                Owner: {owner.fullName || owner.email}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Users", value: stats?.totalUsers || 0 },
              { label: "Owners", value: stats?.owners || 0 },
              { label: "Managers", value: stats?.managers || 0 },
              { label: "Operators", value: stats?.operators || 0 },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl bg-[#F8FAFC] border border-slate-100 px-4 py-3 text-center"
              >
                <p className="text-xl font-black text-[#1B2B4B]">{item.value}</p>
                <p className="text-[11px] font-semibold text-slate-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {canManageUsers && (
        <div className="bg-white rounded-[22px] p-6 shadow-[0_8px_30px_rgba(27,43,75,0.06)] border border-white space-y-5">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-[#1B2B4B]" />
            <h2 className="text-sm font-bold text-[#1B2B4B]">
              {editingUser ? "Edit Company User" : "Register Company User"}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Full name"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
              />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                disabled={Boolean(editingUser)}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm disabled:bg-slate-50"
                required
              />
              {!editingUser && (
                <input
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                  required
                />
              )}
              <input
                type="text"
                placeholder="Mobile number"
                value={form.mobile_number}
                disabled={Boolean(editingUser)}
                onChange={(e) => setForm({ ...form, mobile_number: e.target.value })}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm disabled:bg-slate-50"
                required={!editingUser}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Company Role
                </label>
                <select
                  value={form.isOwner ? "owner" : form.companyRole}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="mt-1 block rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                >
                  {COMPANY_ROLES.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="inline-flex items-center gap-2 text-sm font-medium text-[#1B2B4B] mt-5">
                <input
                  type="checkbox"
                  checked={form.isOwner}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm((prev) => ({
                      ...prev,
                      isOwner: checked,
                      companyRole: checked ? "owner" : "operator",
                      permissions: buildDefaultPermissions(
                        checked ? "owner" : "operator"
                      ),
                    }));
                  }}
                />
                Registering as Owner
              </label>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Shield size={16} className="text-[#1B2B4B]" />
                <h3 className="text-sm font-bold text-[#1B2B4B]">
                  Section Access (Read / Write)
                </h3>
              </div>
              <PermissionMatrix
                permissions={form.permissions}
                onChange={handlePermissionChange}
                disabled={form.isOwner}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-[#1B2B4B] text-white px-5 py-2.5 text-sm font-bold disabled:opacity-50"
              >
                {submitting
                  ? "Saving..."
                  : editingUser
                    ? "Update User"
                    : "Register User"}
              </button>
              {editingUser && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null);
                    setForm(emptyForm);
                  }}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-[22px] shadow-[0_8px_30px_rgba(27,43,75,0.06)] border border-white overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
          <Users size={18} className="text-[#1B2B4B]" />
          <h2 className="text-sm font-bold text-[#1B2B4B]">Company Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-[#FAFBFC] border-b border-slate-100">
                <th className="px-6 py-4">Full Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Registered</th>
                {canManageUsers && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4 font-semibold text-[#1B2B4B]">
                    {user.fullName || "-"}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{user.email}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {user.mobile_number || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <RoleBadge role={user.companyRole} />
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {user.createdAt ? formatDisplayDate(user.createdAt) : "-"}
                  </td>
                  {canManageUsers && (
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(user)}
                          className="p-2 rounded-lg border border-slate-100 text-slate-500 hover:bg-slate-50"
                        >
                          <Pencil size={14} />
                        </button>
                        {user.companyRole !== "owner" && (
                          <button
                            type="button"
                            onClick={() => handleDelete(user)}
                            className="p-2 rounded-lg border border-rose-100 text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CompanyUserManagement;

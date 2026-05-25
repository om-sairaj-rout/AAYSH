import { useState, useEffect } from 'react';
import { 
  Users, 
  ArrowLeft, 
  Package, 
  Check, 
  Weight, 
  Truck,
  UserSquare2,
  Calendar
} from 'lucide-react';
import {
  getOrdersByUser,
  updateOrderWeightAndStatus
} from "../api/statusUpdateAPI";
import { getAllUsers } from '../api/authAPI';
import { toast } from 'react-hot-toast';

const StatusManagement = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [rowEdits, setRowEdits] = useState({});

  const statusOptions = ["Not Shipped", "Booked", "In Transit", "Delivered", "Cancelled", "Delayed"];

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await getAllUsers();
        if (res.success) setUsers(res.users || []);
      } catch (err) {
        console.error("Failed fetching user accounts directory:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleSelectUser = async (user) => {
    try {
      setLoading(true);
      setSelectedUser(user);
      const res = await getOrdersByUser(user._id);
      if (res.success) {
        setOrders(res.orders || []);
        const initialEdits = {};
        (res.orders || []).forEach(o => {
          initialEdits[o._id] = { weight: o.weight || "", status: o.courierStatus };
        });
        setRowEdits(initialEdits);
      }
    } catch (err) {
      console.error("Failed to sync shipments for target customer profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRowChange = (orderId, field, value) => {
    setRowEdits(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [field]: value
      }
    }));
  };

  const handleSaveChanges = async (orderId) => {
    const targetEdit = rowEdits[orderId];
    if (!targetEdit) return;

    try {
      setActionLoadingId(orderId);
      const payload = {
        weight: Number(targetEdit.weight) || 0,
        courierStatus: targetEdit.status
      };

      const res = await updateOrderWeightAndStatus(orderId, payload);
      if (res.success) {
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, weight: payload.weight, courierStatus: payload.courierStatus } : o));
        toast.success("Shipment records saved to database successfully.");
      }
    } catch (err) {
      toast.error("Failed to commit operational status variations to server.");
    } finally {
      setActionLoadingId(orderId);
    }
  };

  if (!selectedUser) {
    return (
      <div className="w-full min-h-screen bg-[#F8FAFC] p-8 font-sans text-slate-700">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Users className="text-indigo-600 w-6 h-6" /> Status & Weight Management
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Select an account below to modify and manage individual delivery weights and logistical status codes.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400 font-medium">Loading customer accounts database index...</div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {users.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => handleSelectUser(user)}
                    className="flex items-center justify-between p-5 hover:bg-slate-50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <UserSquare2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">
                          {user.username}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">
                          {user.company_name || "Independent Account"} • {user.email}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50/50 border border-indigo-100 px-3 py-1 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      View Orders
                    </span>
                  </div>
                ))}

                {users.length === 0 && (
                  <div className="p-12 text-center text-slate-400 text-sm font-medium">No user files registered in system context.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ================= VIEW 2: RENDER SHIPMENTS CONTROL GRID PANEL =================
  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans text-[#1E293B]">
      <div className="max-w-400 mx-auto space-y-4">
        
        {/* Back Navigation Bar Header Section */}
        <button 
          onClick={() => setSelectedUser(null)}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Users Directory
        </button>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Package className="text-indigo-600 w-5 h-5" /> Manifest Upload Data Summary
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Reviewing shipment files belonging to operator profile: <span className="text-slate-700 font-bold">{selectedUser.username}</span> ({selectedUser.company_name})
            </p>
          </div>
        </div>

        {/* Master Data Grid Layout Table */}
        {loading ? (
          <div className="text-center py-12 text-slate-400 font-medium bg-white rounded-2xl border border-slate-100 shadow-sm">Syncing client data profile orders...</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto">
              <thead>
                <tr className="border-b border-slate-100 bg-[#FAFAFA] text-[11px] font-bold tracking-wider text-slate-500 uppercase whitespace-nowrap">
                  <th className="p-4">Pickup Date</th>
                  <th className="p-3">Invoice No.</th>
                  <th className="p-3">Consignee Name</th>
                  <th className="p-3">Destination</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 min-w-32.5"><div className="flex items-center gap-1"><Weight className="w-3.5 h-3.5" /> Edit Weight (kg)</div></th>
                  <th className="p-3 min-w-45"><div className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Edit Status</div></th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-[13px] font-medium text-slate-700">
                {orders.map((order) => {
                  const currentEdit = rowEdits[order._id] || { weight: "", status: "" };
                  const isLoading = actionLoadingId === order._id;

                  // Evaluate if data row value states are dirty (changed from DB state)
                  const isRowUnchanged = 
                    Number(currentEdit.weight) === (order.weight || 0) && 
                    currentEdit.status === order.courierStatus;

                  return (
                    <tr key={order._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 whitespace-nowrap text-slate-500 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-300" />
                          {order.pickupDate ? new Date(order.pickupDate).toLocaleDateString() : "-"}
                        </div>
                      </td>
                      <td className="p-3 font-mono font-bold">{order.invoiceNo || "-"}</td>
                      <td className="p-3 font-semibold text-slate-800">{order.consigneeName || "-"}</td>
                      <td className="p-3">{order.destinationCity || "-"}</td>
                      <td className="p-3 text-center font-bold text-slate-500">{order.qty || "-"}</td>

                      {/* Weight Editing Dynamic Form Box */}
                      <td className="p-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={currentEdit.weight}
                          onChange={(e) => handleRowChange(order._id, 'weight', e.target.value)}
                          placeholder="0.00"
                          className="w-full max-w-25 px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold text-xs"
                        />
                      </td>

                      {/* Lifecyle Status Explicit Dropdown Picker */}
                      <td className="p-3">
                        <select
                          value={currentEdit.status}
                          onChange={(e) => handleRowChange(order._id, 'status', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-bold text-slate-700 cursor-pointer"
                        >
                          {statusOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>

                      {/* Save Changes Explicit Button Trigger */}
                      <td className="p-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          disabled={isRowUnchanged || isLoading}
                          onClick={() => handleSaveChanges(order._id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1 mx-auto ${
                            isRowUnchanged 
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200/50' 
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isLoading ? "Saving..." : "Save"}</span>
                        </button>
                      </td>

                    </tr>
                  );
                })}

                {orders.length === 0 && (
                  <tr>
                    <td colSpan="8" className="p-12 text-center text-slate-400 font-medium">
                      No matching shipments associated with this account.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusManagement;
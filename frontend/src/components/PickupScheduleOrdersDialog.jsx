import { X, Package } from "lucide-react";
import { formatDisplayDate } from "../utils/dateTime";

const PickupScheduleOrdersDialog = ({ open, onClose, pickup }) => {
  if (!open || !pickup) return null;

  const orders =
    pickup.completedOrders?.length > 0
      ? pickup.completedOrders
      : pickup.externalOrderId
      ? [
          {
            externalOrderId: pickup.externalOrderId,
            awbNumber: pickup.awbNumber,
            courierName: pickup.courierName,
            awbAssigned: pickup.awbAssigned,
            awbFailureReason: pickup.failureReason,
            noOfBoxes: Array.isArray(pickup.noOfBoxes)
              ? pickup.noOfBoxes[0]
              : pickup.noOfBoxes ?? pickup.packagesCount ?? 1,
          },
        ]
      : [];

  const title = pickup.scheduleId || pickup.externalOrderId || "Pickup";

  return (
    <div className="modal-overlay bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <Package size={16} className="text-indigo-600" />
              <h3 className="text-base font-bold text-slate-800">Orders for {title}</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {formatDisplayDate(pickup.pickupDate)} · {pickup.pickupLocation} ·{" "}
              {orders.length} order{orders.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {orders.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No orders found for this pickup.</p>
          ) : (
            orders.map((order, index) => (
              <div
                key={order.orderId || order.externalOrderId || index}
                className="rounded-xl border border-slate-100 bg-slate-50/50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400 mb-1">
                      Order {index + 1}
                    </p>
                    <p className="font-bold text-slate-800">
                      #{order.externalOrderId || "—"}
                    </p>
                    {order.shipmentId && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Shipment: {order.shipmentId}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                      order.awbAssigned
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : "bg-amber-100 text-amber-800 border-amber-200"
                    }`}
                  >
                    {order.awbAssigned ? "AWB Assigned" : "AWB Pending"}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-slate-400 font-semibold uppercase text-[10px]">No. of Boxes</p>
                    <p className="font-bold text-slate-700 mt-0.5">{order.noOfBoxes ?? 1}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold uppercase text-[10px]">AWB</p>
                    <p className="font-mono font-bold text-indigo-600 mt-0.5">
                      {order.awbNumber || "Not assigned"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold uppercase text-[10px]">Courier</p>
                    <p className="font-semibold text-slate-700 mt-0.5">
                      {order.courierName || "—"}
                    </p>
                  </div>
                </div>

                {order.awbFailureReason && (
                  <p className="mt-2 text-[11px] text-rose-500">{order.awbFailureReason}</p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PickupScheduleOrdersDialog;

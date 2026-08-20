import { ArrowDown } from "lucide-react";

const ReversePickupRouteCell = ({ fromName, fromCity, fromPincode, toName, toCity, toPincode }) => (
  <div className="flex flex-col gap-1.5 min-w-[210px] max-w-[260px]">
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
        Pickup
      </p>
      <p className="font-semibold text-[#1B2B4B] text-sm leading-snug truncate">
        {fromName || "—"}
      </p>
      <p className="text-xs text-slate-500 mt-0.5">
        {[fromCity, fromPincode].filter(Boolean).join(", ") || "—"}
      </p>
    </div>

    <div className="flex items-center gap-2 px-1">
      <div className="h-px flex-1 bg-slate-200" />
      <ArrowDown size={14} className="text-slate-400 shrink-0" />
      <div className="h-px flex-1 bg-slate-200" />
    </div>

    <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
        Delivery
      </p>
      <p className="font-semibold text-[#1B2B4B] text-sm leading-snug truncate">
        {toName || "—"}
      </p>
      <p className="text-xs text-slate-500 mt-0.5">
        {[toCity, toPincode].filter(Boolean).join(", ") || "—"}
      </p>
    </div>
  </div>
);

export default ReversePickupRouteCell;

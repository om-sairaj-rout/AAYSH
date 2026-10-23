import { useEffect, useState } from "react";
import { X, Zap } from "lucide-react";

const QUICK_AMOUNTS = [500, 1000, 1500, 2500, 5000];
const MIN_RECHARGE_AMOUNT = 500;
const MIN_SHIP_BALANCE = 100;

const RechargeWalletModal = ({
  open,
  onClose,
  onProceed,
  disabled,
  loading,
}) => {
  const [amount, setAmount] = useState(String(MIN_RECHARGE_AMOUNT));

  useEffect(() => {
    if (open) {
      setAmount(String(MIN_RECHARGE_AMOUNT));
    }
  }, [open]);

  if (!open) return null;

  const numericAmount = Number(amount);
  const canProceed =
    !disabled && !loading && Number.isFinite(numericAmount) && numericAmount >= MIN_RECHARGE_AMOUNT;

  const handleProceed = () => {
    if (!canProceed) return;
    onProceed(numericAmount);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recharge-wallet-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="px-8 pt-10 pb-6 text-center">
          <div className="mx-auto w-28 h-20 mb-4 flex items-center justify-center">
            <svg viewBox="0 0 120 80" className="w-full h-full" aria-hidden>
              <rect x="8" y="12" width="72" height="52" rx="6" fill="#E8EAED" />
              <rect x="20" y="22" width="72" height="52" rx="6" fill="#F1F3F5" stroke="#D1D5DB" />
              <rect x="32" y="30" width="56" height="38" rx="5" fill="#1B2B4B" />
              <rect x="68" y="38" width="14" height="10" rx="2" fill="#3B82F6" />
            </svg>
          </div>
          <h2 id="recharge-wallet-title" className="text-xl font-bold text-[#1B2B4B]">
            Recharge Wallet
          </h2>
          <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1.5">
            <span className="text-emerald-600 font-bold">New!</span>
            Minimum balance required to ship is now{" "}
            <span className="line-through text-slate-400 mx-0.5">₹500</span>
            <span className="text-emerald-700 font-bold">₹{MIN_SHIP_BALANCE}</span>
          </p>
        </div>

        <div className="px-8 pb-8 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[#1B2B4B] mb-2">
              Enter Recharge Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">
                ₹
              </span>
              <input
                type="number"
                min={MIN_RECHARGE_AMOUNT}
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-200 text-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B2B4B]/20 focus:border-[#1B2B4B]"
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Note: Minimum recharge value ₹{MIN_RECHARGE_AMOUNT.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setAmount(String((Number(amount) || 0) + value))
                }
                className="px-3 py-1.5 rounded-full border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                + {value.toLocaleString("en-IN")}
              </button>
            ))}
          </div>

          <div className="text-center space-y-1 pt-1">
            <p className="text-sm font-bold text-[#1B2B4B]">
              UPI • Net Banking • Credit Card • Debit Card
            </p>
            <p className="text-xs text-slate-400">
              UPI is free · fee applies on cards &amp; net banking
            </p>
            <p className="text-xs font-semibold text-emerald-600 flex items-center justify-center gap-1 pt-1">
              <Zap size={14} className="text-amber-500 fill-amber-400" />
              Instant - takes just 30 seconds
            </p>
          </div>

          <button
            type="button"
            onClick={handleProceed}
            disabled={!canProceed}
            className="w-full py-3.5 rounded-xl bg-[#1B2B4B] hover:bg-[#152238] text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Please wait..." : "Proceed To Payment"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RechargeWalletModal;

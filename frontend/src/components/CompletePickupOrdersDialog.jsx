import { useRef, useState } from "react";
import { X, Package, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "../utils/toast";
import CreateOrderDialog from "./CreateOrderDialog";
import { completePickupScheduleAPI } from "../api/pickupScheduleAPI";

const CompletePickupOrdersDialog = ({
  open,
  onClose,
  pickupSchedule,
  user,
  isAdmin = false,
  companiesList,
  onSuccess,
}) => {
  const [step, setStep] = useState(1);
  const [orderCount, setOrderCount] = useState(1);
  const [activeTab, setActiveTab] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const formRefs = useRef([]);

  if (!open || !pickupSchedule) return null;

  const resetAndClose = () => {
    setStep(1);
    setOrderCount(1);
    setActiveTab(0);
    formRefs.current = [];
    onClose();
  };

  const handleProceedToForms = () => {
    const count = Number(orderCount);
    if (!Number.isFinite(count) || count < 1 || count > 20) {
      toast.validation("Please enter a valid number of orders (1–20)");
      return;
    }
    setOrderCount(count);
    setActiveTab(0);
    formRefs.current = [];
    setStep(2);
  };

  const handleSubmitAll = async () => {
    const orders = [];
    const documentMeta = [];
    const files = [];

    for (let index = 0; index < orderCount; index += 1) {
      const formRef = formRefs.current[index];
      if (!formRef?.validate()) {
        setActiveTab(index);
        return;
      }

      const payload = formRef.getPayload();
      const { document_types: _ignored, ...orderPayload } = payload;
      orders.push(orderPayload);

      const docs = formRef.getDocuments() || [];
      docs.forEach((doc) => {
        documentMeta.push({
          orderIndex: index,
          documentType: doc.documentType,
        });
        files.push(doc);
      });
    }

    try {
      setSubmitting(true);
      const response = await completePickupScheduleAPI(
        pickupSchedule._id,
        { orders, document_meta: documentMeta },
        files
      );

      if (response.awbAssigned) {
        toast.success(response.message || "Orders created and AWB assigned");
      } else {
        toast.success(
          response.message ||
            "Orders created. AWB assignment failed — ship from All Orders when ready."
        );
        if (response.awbFailureReason) {
          toast.warning(response.awbFailureReason);
        }
      }

      onSuccess?.(response);
      resetAndClose();
    } catch (error) {
      toast.error(error.message || "Failed to complete pickup");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay bg-slate-900/55 backdrop-blur-sm">
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-100 w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Package size={18} className="text-indigo-600" />
              <h2 className="text-xl font-bold text-[#1B2B4B]">Complete Pickup</h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Schedule {pickupSchedule.scheduleId} · {pickupSchedule.pickupLocation}
            </p>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-lg p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {step === 1 ? (
          <div className="p-6 space-y-6">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">
                How many orders should be created for this pickup?
              </label>
              <p className="text-xs text-slate-500 mb-4">
                Each order will have its own customer, package, invoice, and document details.
                AWB will be assigned individually based on each order&apos;s shipment details.
              </p>
              <input
                type="number"
                min={1}
                max={20}
                value={orderCount}
                onChange={(e) => setOrderCount(e.target.value)}
                className="w-full max-w-xs rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={resetAndClose}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedToForms}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
              >
                Continue
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 pt-4 border-b border-slate-100 shrink-0">
              <div className="flex flex-wrap gap-2 pb-3">
                {Array.from({ length: orderCount }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveTab(index)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      activeTab === index
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Order {index + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {Array.from({ length: orderCount }, (_, index) => (
                <div
                  key={index}
                  className={activeTab === index ? "block" : "hidden"}
                >
                  <CreateOrderDialog
                    ref={(node) => {
                      formRefs.current[index] = node;
                    }}
                    open={true}
                    embedded
                    hideSubmit
                    mode="completePickup"
                    pickupSchedule={pickupSchedule}
                    user={user}
                    isAdmin={isAdmin}
                    companiesList={companiesList}
                    onClose={() => {}}
                  />
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 border-t border-slate-100 bg-white px-6 py-4 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  formRefs.current = [];
                }}
                className="inline-flex items-center gap-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
              >
                <ChevronLeft size={16} />
                Back
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitAll}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {submitting
                  ? "Creating orders..."
                  : `Create ${orderCount} Order${orderCount > 1 ? "s" : ""} & Assign AWB`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CompletePickupOrdersDialog;

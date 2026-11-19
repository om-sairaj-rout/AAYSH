/**
 * Delhivery FM pickup scheduling via Aaysh is disabled.
 * Warehouse handover is scheduled manually in Delhivery One.
 * Admin Pickup / shipping workflows may still call this hook safely (no-op).
 */
const enqueueDelhiveryPickupAfterShipped = async ({
  shipping,
  previousStatus,
  updatedBy = null,
}) => {
  void shipping;
  void previousStatus;
  void updatedBy;
  return {
    ok: true,
    skipped: true,
    reason: "delhivery_fm_scheduling_disabled",
  };
};

module.exports = {
  enqueueDelhiveryPickupAfterShipped,
};
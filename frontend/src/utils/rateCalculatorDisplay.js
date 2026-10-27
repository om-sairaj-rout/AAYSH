/** True when the service has a positive weight-slab / freight rate for display. */
export const isServiceRateAvailable = (mode) => {
  if (!mode?.success || !mode?.data) return false;

  const data = mode.data;
  const breakdown = data.breakdown || {};
  const slabRate = Number(
    breakdown.weightSlabRate ?? data.rate?.total ?? 0
  );
  const finalRate = Number(breakdown.finalRate ?? 0);

  if (breakdown.finalRate != null && Number.isFinite(finalRate)) {
    return finalRate > 0;
  }

  return Number.isFinite(slabRate) && slabRate > 0;
};

export const filterAvailableRateModes = (modes = []) =>
  (modes || []).filter(isServiceRateAvailable);

export const NO_SERVICES_MESSAGE =
  "No services available for the selected weight and location.";

/**
 * Ensures priority response includes every courier in the system,
 * preserving saved order and appending new couriers at the end.
 */
const mergePriorityWithAllCouriers = (priorityEntries = [], allCouriers = []) => {
  const byId = new Map(
    allCouriers.map((courier) => [String(courier._id), courier.name])
  );

  const sortedExisting = [...(priorityEntries || [])].sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );

  const merged = [];
  const seen = new Set();

  for (const entry of sortedExisting) {
    const id = String(entry.courierId);
    if (!byId.has(id) || seen.has(id)) continue;
    seen.add(id);
    merged.push({
      courierId: entry.courierId,
      courierName: byId.get(id) || entry.courierName,
      order: merged.length + 1,
    });
  }

  for (const courier of allCouriers) {
    const id = String(courier._id);
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push({
      courierId: courier._id,
      courierName: courier.name,
      order: merged.length + 1,
    });
  }

  return merged;
};

module.exports = { mergePriorityWithAllCouriers };

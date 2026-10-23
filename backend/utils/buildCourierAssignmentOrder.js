/**
 * AWB assignment tries couriers in priority order, then any other serviceable
 * couriers (e.g. added after priority was last saved).
 */
const buildCourierAssignmentOrder = (priorityList, availableCouriers) => {
  const serviceableById = new Map();
  for (const c of availableCouriers || []) {
    serviceableById.set(c.courierId.toString(), c);
  }

  const seen = new Set();
  const ordered = [];

  for (const p of priorityList || []) {
    const id = p.courierId.toString();
    if (!serviceableById.has(id) || seen.has(id)) {
      continue;
    }
    const row = serviceableById.get(id);
    ordered.push({
      courierId: p.courierId,
      courierName: p.courierName || row.courierName,
    });
    seen.add(id);
  }

  for (const c of availableCouriers || []) {
    const id = c.courierId.toString();
    if (seen.has(id)) {
      continue;
    }
    ordered.push({
      courierId: c.courierId,
      courierName: c.courierName,
    });
    seen.add(id);
  }

  return ordered;
};

module.exports = { buildCourierAssignmentOrder };

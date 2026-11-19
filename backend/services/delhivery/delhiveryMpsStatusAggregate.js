const FORWARD_PROGRESS_RANK = Object.freeze({
  Shipped: 10,
  Delayed: 15,
  "In Transit": 20,
  Undelivered: 25,
  "Out For Delivery": 30,
  Delivered: 40,
});

const rankOf = (status) =>
  FORWARD_PROGRESS_RANK[String(status || "").trim()] ?? -1;

/**
 * Conservative MPS order-level status from per-package mapped statuses.
 */
const aggregateMpsPackageStatuses = (packageStatuses) => {
  const rows = (packageStatuses || [])
    .map((p) => ({
      waybill: p.waybill,
      status: String(p.aayshStatus || "").trim(),
    }))
    .filter((p) => p.status);

  if (!rows.length) {
    return { ok: false, message: "No package status could be mapped." };
  }

  if (rows.every((r) => r.status === "Delivered")) {
    return { ok: true, aayshStatus: "Delivered", mode: "all_delivered" };
  }

  const rtRows = rows.filter((r) => r.status === "RTO");
  const nonTerminalForward = rows.filter(
    (r) =>
      r.status !== "RTO" &&
      r.status !== "Delivered" &&
      r.status !== "Cancelled"
  );

  if (rtRows.length > 0 && nonTerminalForward.length === 0) {
    const allTerminal = rows.every((r) =>
      ["RTO", "Delivered", "Cancelled"].includes(r.status)
    );
    if (allTerminal && rtRows.length === rows.length) {
      return { ok: true, aayshStatus: "RTO", mode: "all_rto" };
    }
    if (allTerminal && rtRows.length > 0) {
      return { ok: true, aayshStatus: "RTO", mode: "mixed_terminal_rto" };
    }
  }

  const forwardRows = rows.filter(
    (r) => r.status !== "RTO" && r.status !== "Cancelled"
  );

  if (!forwardRows.length) {
    if (rows.some((r) => r.status === "Cancelled")) {
      return { ok: true, aayshStatus: "Cancelled", mode: "cancelled" };
    }
    if (rtRows.length) {
      return { ok: true, aayshStatus: "RTO", mode: "rto_only" };
    }
    return { ok: false, message: "No forward package status available." };
  }

  if (forwardRows.some((r) => r.status === "Undelivered")) {
    const maxOther = Math.max(
      ...forwardRows
        .filter((r) => r.status !== "Undelivered")
        .map((r) => rankOf(r.status)),
      -1
    );
    if (maxOther < rankOf("Out For Delivery")) {
      return {
        ok: true,
        aayshStatus: "Undelivered",
        mode: "any_undelivered",
      };
    }
  }

  let chosen = forwardRows[0].status;
  let chosenRank = rankOf(chosen);

  for (const row of forwardRows) {
    const r = rankOf(row.status);
    if (r >= 0 && r < chosenRank) {
      chosen = row.status;
      chosenRank = r;
    }
  }

  if (chosenRank < 0) {
    return { ok: false, message: "Could not aggregate package statuses." };
  }

  return {
    ok: true,
    aayshStatus: chosen,
    mode: "least_forward_progress",
    packages: rows,
  };
};

module.exports = {
  aggregateMpsPackageStatuses,
  FORWARD_PROGRESS_RANK,
};
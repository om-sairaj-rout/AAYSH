const RECONCILIATION_PHASE = {
  NONE: "none",
  IN_PROGRESS: "reconciliation_in_progress",
  FAILED: "reconciliation_failed",
  COMPLETED: "reconciliation_completed",
};

/** Active reconciliation claims older than this may be taken over safely. */
const RECONCILIATION_CLAIM_STALE_MS = 5 * 60 * 1000;

const isReconciliationManifestState = (manifest) =>
  ["uncertain", "reconciliation_required"].includes(manifest?.manifestStatus) ||
  Boolean(manifest?.reconciliationRequired);

const assertOrderManifestCompanyMatch = (order, manifest) => {
  const orderCompany = String(order?.companyID || "").trim().toUpperCase();
  const manifestCompany = String(manifest?.companyID || "").trim().toUpperCase();
  if (!orderCompany || !manifestCompany || orderCompany !== manifestCompany) {
    return {
      ok: false,
      message: "Manifest company does not match order company.",
    };
  }
  return { ok: true };
};

const isStaleReconciliationClaim = (manifest, nowMs = Date.now()) => {
  if (manifest?.reconciliationPhase !== RECONCILIATION_PHASE.IN_PROGRESS) {
    return false;
  }
  const claimedAt = manifest?.reconciliationClaimedAt
    ? new Date(manifest.reconciliationClaimedAt).getTime()
    : 0;
  if (!claimedAt) return true;
  return nowMs - claimedAt >= RECONCILIATION_CLAIM_STALE_MS;
};

const canAcquireReconciliationClaim = (manifest, nowMs = Date.now()) => {
  if (!isReconciliationManifestState(manifest)) {
    return { ok: false, reason: "NOT_RECONCILIATION_STATE" };
  }
  const phase = manifest.reconciliationPhase || RECONCILIATION_PHASE.NONE;
  if (phase === RECONCILIATION_PHASE.COMPLETED) {
    return { ok: false, reason: "ALREADY_COMPLETED" };
  }
  if (phase === RECONCILIATION_PHASE.IN_PROGRESS) {
    if (!isStaleReconciliationClaim(manifest, nowMs)) {
      return { ok: false, reason: "CLAIM_ACTIVE" };
    }
    return { ok: true, reason: "STALE_CLAIM_TAKEOVER" };
  }
  return { ok: true, reason: "NEW_OR_RETRY" };
};

const buildReconciliationClaimFilter = (manifestId, nowMs = Date.now()) => {
  const staleBefore = new Date(nowMs - RECONCILIATION_CLAIM_STALE_MS);
  return {
    _id: manifestId,
    reconciliationPhase: {
      $nin: [RECONCILIATION_PHASE.COMPLETED],
    },
    $and: [
      {
        $or: [
          {
            reconciliationPhase: {
              $in: [
                RECONCILIATION_PHASE.NONE,
                RECONCILIATION_PHASE.FAILED,
                null,
              ],
            },
          },
          { reconciliationPhase: { $exists: false } },
          {
            reconciliationPhase: RECONCILIATION_PHASE.IN_PROGRESS,
            reconciliationClaimedAt: { $lte: staleBefore },
          },
          {
            reconciliationPhase: RECONCILIATION_PHASE.IN_PROGRESS,
            reconciliationClaimedAt: null,
          },
        ],
      },
      {
        $or: [
          { manifestStatus: { $in: ["uncertain", "reconciliation_required"] } },
          { reconciliationRequired: true },
        ],
      },
    ],
  };
};

const verifyReservedAwbsAgainstManifest = (reservedAwbs, manifest) => {
  if (!manifest?.masterAwb) {
    return { ok: true, releasableAwbs: reservedAwbs };
  }
  const expectedSet = new Set(
    [manifest.masterAwb, ...(manifest.childAwbs || [])].filter(Boolean)
  );
  if (!expectedSet.size) {
    return { ok: true, releasableAwbs: reservedAwbs };
  }
  const mismatch = reservedAwbs.some((row) => !expectedSet.has(row.awbNumber));
  if (mismatch) {
    return {
      ok: false,
      message:
        "Reserved AWBs do not match manifest waybills. Verify order and manifest before release.",
    };
  }
  return { ok: true, releasableAwbs: reservedAwbs };
};

const evaluateAwbReleaseOutcome = ({
  expectedCount,
  releasedCount,
  releasedNumbers = [],
}) => {
  if (expectedCount <= 0) {
    return {
      complete: false,
      partial: false,
      releasedCount,
      expectedCount,
      releasedNumbers,
      message: "No reserved Delhivery AWBs found for this order.",
    };
  }
  if (releasedCount === expectedCount) {
    return {
      complete: true,
      partial: false,
      releasedCount,
      expectedCount,
      releasedNumbers,
      message: "",
    };
  }
  if (releasedCount > 0 && releasedCount < expectedCount) {
    return {
      complete: false,
      partial: true,
      releasedCount,
      expectedCount,
      releasedNumbers,
      message: `Partial AWB release: released ${releasedCount} of ${expectedCount} reserved AWBs. Retry after investigation.`,
    };
  }
  return {
    complete: false,
    partial: false,
    releasedCount,
    expectedCount,
    releasedNumbers,
    message:
      "No reserved AWBs were released. They may have changed status. Retry reconciliation.",
  };
};

module.exports = {
  RECONCILIATION_PHASE,
  RECONCILIATION_CLAIM_STALE_MS,
  isReconciliationManifestState,
  assertOrderManifestCompanyMatch,
  isStaleReconciliationClaim,
  canAcquireReconciliationClaim,
  buildReconciliationClaimFilter,
  verifyReservedAwbsAgainstManifest,
  evaluateAwbReleaseOutcome,
};

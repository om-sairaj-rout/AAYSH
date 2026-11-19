/** Delhivery edit API `pt` values — staging must confirm before changing. */
const DELHIVERY_EDIT_PT = Object.freeze({
  COD: "COD",
  PREPAID: "Prepaid",
});

const WAYBILL_RESULT_STATUS = Object.freeze({
  PENDING: "pending",
  REQUEST_SENT: "request_sent",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  UNCERTAIN: "uncertain",
});

const OPERATION_STATUS = Object.freeze({
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  INCOMPLETE: "incomplete",
  UNCERTAIN: "uncertain",
  FAILED: "failed",
  LOCAL_SYNC_FAILED: "local_sync_failed",
});

const ACTIVE_OPERATION_STATUSES = new Set([
  OPERATION_STATUS.IN_PROGRESS,
  OPERATION_STATUS.INCOMPLETE,
  OPERATION_STATUS.UNCERTAIN,
  OPERATION_STATUS.LOCAL_SYNC_FAILED,
]);

const buildWaybillResultRows = (waybills = []) =>
  waybills.map((waybill) => ({
    waybill: String(waybill),
    status: WAYBILL_RESULT_STATUS.PENDING,
    attemptedAt: null,
    httpStatus: null,
    responseSummary: null,
    errorMessage: "",
  }));

const isDefiniteApiRejection = (row) =>
  row?.status === WAYBILL_RESULT_STATUS.FAILED &&
  row?.definiteFailure === true;

const isNeverSentPending = (row) =>
  row?.status === WAYBILL_RESULT_STATUS.PENDING && !row?.attemptedAt && !row?.requestSentAt;

const needsRemoteVerification = (row) =>
  row?.status === WAYBILL_RESULT_STATUS.UNCERTAIN ||
  row?.status === WAYBILL_RESULT_STATUS.REQUEST_SENT;

const getWaybillsForSafeApiRetry = (waybillResults = []) =>
  waybillResults.filter(
    (row) => isNeverSentPending(row) || isDefiniteApiRejection(row)
  );

const getWaybillsForRemoteVerification = (waybillResults = []) =>
  waybillResults.filter((row) => needsRemoteVerification(row));

/** @deprecated Use getWaybillsForSafeApiRetry / getWaybillsForRemoteVerification */
const getWaybillsNeedingEdit = (waybillResults = []) =>
  getWaybillsForSafeApiRetry(waybillResults).concat(
    getWaybillsForRemoteVerification(waybillResults)
  );

const isOperationRemotelyComplete = (waybillResults = []) =>
  waybillResults.length > 0 &&
  waybillResults.every((row) => row.status === WAYBILL_RESULT_STATUS.SUCCEEDED);

const summarizeOperation = (operation) => {
  const rows = operation?.waybillResults || [];
  return {
    operationId: operation?._id,
    operationStatus: operation?.operationStatus,
    localSyncApplied: Boolean(operation?.localSyncApplied),
    waybills: rows.map((r) => ({
      waybill: r.waybill,
      status: r.status,
      errorMessage: r.errorMessage,
      attemptedAt: r.attemptedAt,
    })),
    requiresRecovery:
      ACTIVE_OPERATION_STATUSES.has(operation?.operationStatus) &&
      !operation?.localSyncApplied,
  };
};

const applyWaybillResultToRows = (rows, waybill, patch) =>
  rows.map((row) =>
    String(row.waybill) === String(waybill) ? { ...row, ...patch } : row
  );

const resolveNextOperationStatus = (rows, { uncertain = false } = {}) => {
  if (rows.every((r) => r.status === WAYBILL_RESULT_STATUS.SUCCEEDED)) {
    return OPERATION_STATUS.COMPLETED;
  }
  if (uncertain || rows.some((r) => r.status === WAYBILL_RESULT_STATUS.UNCERTAIN)) {
    return OPERATION_STATUS.UNCERTAIN;
  }
  if (rows.some((r) => r.status === WAYBILL_RESULT_STATUS.SUCCEEDED)) {
    return OPERATION_STATUS.INCOMPLETE;
  }
  return OPERATION_STATUS.FAILED;
};

const buildChangeFingerprint = (changes, paymentModeChange) =>
  JSON.stringify({
    changes: changes || {},
    paymentModeChange: Boolean(paymentModeChange),
  });

module.exports = {
  DELHIVERY_EDIT_PT,
  WAYBILL_RESULT_STATUS,
  OPERATION_STATUS,
  ACTIVE_OPERATION_STATUSES,
  buildWaybillResultRows,
  getWaybillsNeedingEdit,
  getWaybillsForSafeApiRetry,
  getWaybillsForRemoteVerification,
  isDefiniteApiRejection,
  isNeverSentPending,
  needsRemoteVerification,
  isOperationRemotelyComplete,
  summarizeOperation,
  applyWaybillResultToRows,
  resolveNextOperationStatus,
  buildChangeFingerprint,
};

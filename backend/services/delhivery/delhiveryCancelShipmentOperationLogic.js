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
    requestSentAt: null,
    completedAt: null,
    httpStatus: null,
    responseSummary: null,
    errorMessage: "",
    definiteFailure: false,
    verificationOutcome: "",
    verificationMessage: "",
    verifiedAt: null,
  }));

const isNeverSentPending = (row) =>
  row?.status === WAYBILL_RESULT_STATUS.PENDING && !row?.requestSentAt;

const isDefiniteApiRejection = (row) =>
  row?.status === WAYBILL_RESULT_STATUS.FAILED && row?.definiteFailure === true;

const needsRemoteVerification = (row) =>
  row?.status === WAYBILL_RESULT_STATUS.UNCERTAIN ||
  row?.status === WAYBILL_RESULT_STATUS.REQUEST_SENT;

const getWaybillsForSafeApiRetry = (waybillResults = []) =>
  waybillResults.filter(
    (row) => isNeverSentPending(row) || isDefiniteApiRejection(row)
  );

const getWaybillsForRemoteVerification = (waybillResults = []) =>
  waybillResults.filter((row) => needsRemoteVerification(row));

const isOperationRemotelyComplete = (waybillResults = []) =>
  waybillResults.length > 0 &&
  waybillResults.every((row) => row.status === WAYBILL_RESULT_STATUS.SUCCEEDED);

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

const summarizeOperation = (operation) => ({
  operationId: operation?._id,
  operationStatus: operation?.operationStatus,
  localSyncApplied: Boolean(operation?.localSyncApplied),
  shipmentType: operation?.shipmentType || "",
  paymentMode: operation?.paymentMode || "",
  waybills: (operation?.waybillResults || []).map((r) => ({
    waybill: r.waybill,
    status: r.status,
    errorMessage: r.errorMessage,
    verificationOutcome: r.verificationOutcome,
  })),
  requiresRecovery:
    ACTIVE_OPERATION_STATUSES.has(operation?.operationStatus) &&
    !operation?.localSyncApplied,
  lastError: operation?.lastError || "",
});

module.exports = {
  WAYBILL_RESULT_STATUS,
  OPERATION_STATUS,
  ACTIVE_OPERATION_STATUSES,
  buildWaybillResultRows,
  getWaybillsForSafeApiRetry,
  getWaybillsForRemoteVerification,
  isNeverSentPending,
  isDefiniteApiRejection,
  isOperationRemotelyComplete,
  applyWaybillResultToRows,
  resolveNextOperationStatus,
  summarizeOperation,
};
/**
 * Explicit wallet handling after assignDelhiveryCodOrders debits and manifest returns.
 * Do not rely on undefined definiteFailure alone.
 */
const resolveDelhiveryManifestWalletAction = (manifestResult = {}) => {
  if (manifestResult.success) {
    return { reverse: false, reconcile: false };
  }
  if (manifestResult.walletShouldReverse === true) {
    return { reverse: true, reconcile: false };
  }
  if (
    manifestResult.walletShouldReconcile === true ||
    manifestResult.uncertain === true ||
    manifestResult.reconciliationRequired === true
  ) {
    return { reverse: false, reconcile: true };
  }
  if (
    manifestResult.definiteFailure === true &&
    !manifestResult.uncertain &&
    !manifestResult.reconciliationRequired &&
    !manifestResult.inProgress
  ) {
    return { reverse: true, reconcile: false };
  }
  return { reverse: false, reconcile: false };
};

/**
 * Whether reserved AWBs may be released on manifest catch (never after CMU may have run).
 */
const shouldReleaseReservedAwbsOnManifestCatch = ({
  cmuRequestWasMarked = false,
  cmuResponseIndicatesAcceptance = false,
} = {}) => !(cmuRequestWasMarked || cmuResponseIndicatesAcceptance);

module.exports = {
  resolveDelhiveryManifestWalletAction,
  shouldReleaseReservedAwbsOnManifestCatch,
};

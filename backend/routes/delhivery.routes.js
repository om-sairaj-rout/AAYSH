const express = require("express");
const { checkAuth, checkPermission } = require("../middlewares/auth.middleware");
const delhiveryCodPrecheck = require("../controllers/delhiveryControllers/delhiveryCodPrecheck.controllers");
const delhiveryHeavyServiceability = require("../controllers/delhiveryControllers/delhiveryHeavyServiceability.controllers");
const {
  getDelhiveryAwbPoolStatus,
  listDelhiveryAwbsController,
  bulkFetchDelhiveryAwbs,
  singleFetchDelhiveryAwb,
  triggerAutoReplenishNow,
} = require("../controllers/delhiveryControllers/delhiveryAwbPool.controllers");
const {
  listDelhiveryPickupLocations,
  createDelhiveryPickupLocation,
  updateDelhiveryPickupLocation,
} = require("../controllers/delhiveryControllers/delhiveryPickupLocation.controllers");
const {
  adminReleaseDelhiveryManifestReconciliation,
} = require("../controllers/delhiveryControllers/delhiveryManifestReconcile.controllers");
const {
  getDelhiveryShipmentEditEligibility,
  editDelhiveryShipmentController,
  listIncompleteDelhiveryEdits,
} = require("../controllers/delhiveryControllers/delhiveryEditShipment.controllers");
const {
  getDelhiveryShipmentCancelEligibility,
  cancelDelhiveryShipmentController,
  listIncompleteDelhiveryCancellations,
} = require("../controllers/delhiveryControllers/delhiveryCancelShipment.controllers");
const {
  getDelhiveryShipmentDocumentOptions,
  downloadDelhiveryShipmentDocument,
} = require("../controllers/delhiveryControllers/delhiveryDocument.controllers");
const {
  getDelhiveryNdrEligibilityController,
  submitDelhiveryNdrController,
  getDelhiveryUplStatusController,
  listDelhiveryNdrHistoryController,
} = require("../controllers/delhiveryControllers/delhiveryNdr.controllers");

const router = express.Router();

router.get(
  "/delhivery/cod-precheck",
  checkAuth,
  delhiveryCodPrecheck
);

router.post(
  "/delhivery/cod-precheck",
  checkAuth,
  delhiveryCodPrecheck
);

router.get(
  "/delhivery/heavy-pincode-serviceability",
  checkAuth,
  delhiveryHeavyServiceability
);

router.post(
  "/delhivery/heavy-pincode-serviceability",
  checkAuth,
  delhiveryHeavyServiceability
);

router.get(
  "/delhivery/awb-pool/status",
  checkAuth,
  checkPermission("update", "read"),
  getDelhiveryAwbPoolStatus
);

router.get(
  "/delhivery/awb-pool/awbs",
  checkAuth,
  checkPermission("update", "read"),
  listDelhiveryAwbsController
);

router.post(
  "/delhivery/awb-pool/fetch-bulk",
  checkAuth,
  checkPermission("update", "write"),
  bulkFetchDelhiveryAwbs
);

router.post(
  "/delhivery/awb-pool/fetch-single",
  checkAuth,
  checkPermission("update", "write"),
  singleFetchDelhiveryAwb
);

router.post(
  "/delhivery/awb-pool/replenish-now",
  checkAuth,
  checkPermission("update", "write"),
  triggerAutoReplenishNow
);

router.get(
  "/delhivery/pickup-locations",
  checkAuth,
  checkPermission("orders", "read"),
  listDelhiveryPickupLocations
);

router.post(
  "/delhivery/pickup-locations",
  checkAuth,
  checkPermission("update", "write"),
  createDelhiveryPickupLocation
);

router.patch(
  "/delhivery/pickup-locations/:id",
  checkAuth,
  checkPermission("update", "write"),
  updateDelhiveryPickupLocation
);

router.post(
  "/delhivery/manifest/:orderId/admin-reconcile-release",
  checkAuth,
  checkPermission("update", "write"),
  adminReleaseDelhiveryManifestReconciliation
);

router.get(
  "/delhivery/shipments/:orderId/edit-eligibility",
  checkAuth,
  checkPermission("orders", "write"),
  getDelhiveryShipmentEditEligibility
);

router.post(
  "/delhivery/shipments/:orderId/edit",
  checkAuth,
  checkPermission("orders", "write"),
  editDelhiveryShipmentController
);

router.get(
  "/delhivery/edit-operations/incomplete",
  checkAuth,
  checkPermission("orders", "read"),
  listIncompleteDelhiveryEdits
);

router.get(
  "/delhivery/shipments/:orderId/cancel-eligibility",
  checkAuth,
  checkPermission("orders", "write"),
  getDelhiveryShipmentCancelEligibility
);

router.post(
  "/delhivery/shipments/:orderId/cancel",
  checkAuth,
  checkPermission("orders", "write"),
  cancelDelhiveryShipmentController
);

router.get(
  "/delhivery/cancel-operations/incomplete",
  checkAuth,
  checkPermission("update", "read"),
  listIncompleteDelhiveryCancellations
);

router.get(
  "/delhivery/shipments/:orderId/documents/options",
  checkAuth,
  checkPermission("orders", "read"),
  getDelhiveryShipmentDocumentOptions
);

router.get(
  "/delhivery/shipments/:orderId/documents",
  checkAuth,
  checkPermission("orders", "read"),
  downloadDelhiveryShipmentDocument
);

router.get(
  "/delhivery/shipments/:orderId/ndr-eligibility",
  checkAuth,
  checkPermission("update", "write"),
  getDelhiveryNdrEligibilityController
);

router.post(
  "/delhivery/shipments/:orderId/ndr",
  checkAuth,
  checkPermission("update", "write"),
  submitDelhiveryNdrController
);

router.get(
  "/delhivery/shipments/:orderId/ndr/history",
  checkAuth,
  checkPermission("update", "write"),
  listDelhiveryNdrHistoryController
);

router.get(
  "/delhivery/ndr/:uplId/status",
  checkAuth,
  checkPermission("update", "write"),
  getDelhiveryUplStatusController
);

module.exports = router;

const express = require("express");
const multer = require("multer");
const pincodeZoneRouter = express.Router();
const { checkAuth, checkPermission } = require("../middlewares/auth.middleware");
const {
  getZoneSummary,
  previewPincodeZoneImport,
  importPincodeZone,
} = require("../controllers/pincodeZoneControllers/pincodeZone.controllers");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const name = String(file.originalname || "").toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only .xlsx, .xls, or .csv files are allowed."));
    }
  },
});

pincodeZoneRouter.get(
  "/admin/pincode-zones/summary",
  checkAuth,
  checkPermission("update", "read"),
  getZoneSummary
);

pincodeZoneRouter.post(
  "/admin/pincode-zones/preview",
  checkAuth,
  checkPermission("update", "write"),
  upload.single("file"),
  previewPincodeZoneImport
);

pincodeZoneRouter.post(
  "/admin/pincode-zones/import",
  checkAuth,
  checkPermission("update", "write"),
  upload.single("file"),
  importPincodeZone
);

module.exports = pincodeZoneRouter;

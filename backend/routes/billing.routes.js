const express = require("express");
const billingRouter = express.Router();
const upload = require("../middlewares/upload.middleware");
const { checkAuth, checkPermission } = require("../middlewares/auth.middleware");
const {
  previewBillingInvoice,
  previewBillingInvoiceFromExcel,
  exportBillingInvoicePdf,
  exportBillingInvoiceExcel,
  saveBillingInvoice,
  listBillingInvoiceHistory,
  exportSavedBillingInvoicePdf,
  exportSavedBillingInvoiceExcel,
  deleteSavedBillingInvoice,
} = require("../controllers/billingControllers/billingInvoice.controllers");

billingRouter.post(
  "/billing/invoice/preview",
  checkAuth,
  checkPermission("update", "read"),
  previewBillingInvoice
);

billingRouter.post(
  "/billing/invoice/preview-excel",
  checkAuth,
  checkPermission("update", "read"),
  upload.single("file"),
  previewBillingInvoiceFromExcel
);

billingRouter.post(
  "/billing/invoice/export/pdf",
  checkAuth,
  checkPermission("update", "write"),
  exportBillingInvoicePdf
);

billingRouter.post(
  "/billing/invoice/export/excel",
  checkAuth,
  checkPermission("update", "write"),
  exportBillingInvoiceExcel
);

billingRouter.post(
  "/billing/invoice/save",
  checkAuth,
  checkPermission("update", "write"),
  saveBillingInvoice
);

billingRouter.get(
  "/billing/invoice/history",
  checkAuth,
  checkPermission("update", "read"),
  listBillingInvoiceHistory
);

billingRouter.get(
  "/billing/invoice/history/:id/pdf",
  checkAuth,
  checkPermission("update", "read"),
  exportSavedBillingInvoicePdf
);

billingRouter.get(
  "/billing/invoice/history/:id/excel",
  checkAuth,
  checkPermission("update", "read"),
  exportSavedBillingInvoiceExcel
);

billingRouter.delete(
  "/billing/invoice/history/:id",
  checkAuth,
  checkPermission("update", "write"),
  deleteSavedBillingInvoice
);

module.exports = billingRouter;

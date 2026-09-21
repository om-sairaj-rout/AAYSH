const express = require("express");
const billingRouter = express.Router();
const { checkAuth, checkPermission } = require("../middlewares/auth.middleware");
const {
  previewBillingInvoice,
  exportBillingInvoicePdf,
  exportBillingInvoiceExcel,
  saveBillingInvoice,
  listBillingInvoiceHistory,
  exportSavedBillingInvoicePdf,
  exportSavedBillingInvoiceExcel,
} = require("../controllers/billingControllers/billingInvoice.controllers");

billingRouter.post(
  "/billing/invoice/preview",
  checkAuth,
  checkPermission("update", "read"),
  previewBillingInvoice
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

module.exports = billingRouter;

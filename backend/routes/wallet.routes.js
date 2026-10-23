const express = require("express");
const walletRouter = express.Router();
const { checkAuth, checkPermission } = require("../middlewares/auth.middleware");
const {
  getWalletOverview,
  getWalletTransactions,
  getWalletRecharges,
  initiateWalletRecharge,
  verifyWalletRecharge,
  cancelWalletRecharge,
  adminWalletAdjust,
  updateCompanyWalletSetting,
} = require("../controllers/walletControllers/wallet.controllers");

walletRouter.get(
  "/wallet",
  checkAuth,
  checkPermission("orders", "read"),
  getWalletOverview
);

walletRouter.get(
  "/wallet/transactions",
  checkAuth,
  checkPermission("orders", "read"),
  getWalletTransactions
);

walletRouter.get(
  "/wallet/recharges",
  checkAuth,
  checkPermission("orders", "read"),
  getWalletRecharges
);

walletRouter.post(
  "/wallet/recharges",
  checkAuth,
  checkPermission("orders", "write"),
  initiateWalletRecharge
);

walletRouter.post(
  "/wallet/recharges/verify",
  checkAuth,
  checkPermission("orders", "write"),
  verifyWalletRecharge
);

walletRouter.post(
  "/wallet/recharges/cancel",
  checkAuth,
  checkPermission("orders", "write"),
  cancelWalletRecharge
);

walletRouter.post(
  "/wallet/admin/adjust",
  checkAuth,
  checkPermission("settings", "write"),
  adminWalletAdjust
);

walletRouter.patch(
  "/companies/:companyID/wallet-settings",
  checkAuth,
  checkPermission("settings", "write"),
  updateCompanyWalletSetting
);

module.exports = walletRouter;

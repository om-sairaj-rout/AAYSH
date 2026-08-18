const express = require('express');

const uploadRouter = express.Router();

const UploadController = require('../controllers/uploadControllers/uploadFile.controllers.js');

const getUploadHistoryController = require('../controllers/uploadControllers/getUploadHistory.controllers.js');

const deleteFileController = require('../controllers/uploadControllers/deleteFile.controllers.js');

const downloadUserOrdersExcelController = require('../controllers/uploadControllers/downloadUserOrdersExcel.js');
const downloadCompanyOrdersExcelController = require('../controllers/uploadControllers/downloadCompanyOrdersExcel.js');
const getStatusUpdateCompaniesController = require('../controllers/uploadControllers/getStatusUpdateCompanies.controllers.js');

const uploadAndUpdateStatusExcelController = require('../controllers/uploadControllers/uploadAndUpdateStatusExcel.controllers.js');

const upload = require('../middlewares/upload.middleware.js');

const { checkAuth, authRoles, checkPermission } = require('../middlewares/auth.middleware.js');

uploadRouter.post(
    '/external/upload',
    checkAuth,
    checkPermission("upload", "write"),
    upload.single("file"),
    UploadController
);

uploadRouter.get(
    '/upload/history',
    checkAuth,
    checkPermission("upload", "read"),
    getUploadHistoryController
);

uploadRouter.delete(
    '/upload/history/:id',
    checkAuth,
    checkPermission("upload", "write"),
    deleteFileController
);

uploadRouter.get(
  "/status-update/companies",
  checkAuth,
  authRoles("admin"),
  getStatusUpdateCompaniesController
);

uploadRouter.get(
  "/download-company-orders/:companyID",
  checkAuth,
  authRoles("admin"),
  downloadCompanyOrdersExcelController
);

uploadRouter.get(
  "/download-user-orders/:userId",
  checkAuth,
  authRoles("admin"),
  downloadUserOrdersExcelController
);

uploadRouter.post(
  "/upload-status-excel/:companyID",
  checkAuth,
  authRoles("admin"),
  upload.single("file"),
  uploadAndUpdateStatusExcelController
);

module.exports = uploadRouter;
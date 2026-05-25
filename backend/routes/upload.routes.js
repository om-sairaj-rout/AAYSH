const express = require('express');

const uploadRouter = express.Router();

const UploadController = require('../controllers/uploadControllers/uploadFile.controllers.js');

const getUploadHistoryController = require('../controllers/uploadControllers/getUploadHistory.controllers.js');

const deleteFileController = require('../controllers/uploadControllers/deleteFile.controllers.js');

const downloadUserOrdersExcelController = require('../controllers/uploadControllers/downloadUserOrdersExcel.js');

const uploadAndUpdateStatusExcelController = require('../controllers/uploadControllers/uploadAndUpdateStatusExcel.controllers.js');

const upload = require('../middlewares/upload.middleware.js');

const { checkAuth, authRoles } = require('../middlewares/auth.middleware.js');

uploadRouter.post(
    '/upload',
    checkAuth,
    upload.single("file"),
    UploadController
);

uploadRouter.get(
    '/upload/history',
    checkAuth,
    getUploadHistoryController
);

uploadRouter.delete(
    '/upload/history/:id',
    checkAuth,
    deleteFileController
);

uploadRouter.get(
  "/download-user-orders/:userId",
  checkAuth,
  downloadUserOrdersExcelController
);

uploadRouter.post(
  "/upload-status-excel/:userId",
  checkAuth,
  authRoles("admin"),
  upload.single("file"),
  uploadAndUpdateStatusExcelController
);

module.exports = uploadRouter;
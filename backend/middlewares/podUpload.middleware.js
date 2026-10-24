const multer = require("multer");
const { POD_MAX_BYTES } = require("../utils/shipmentPod");

const storage = multer.memoryStorage();

const podUpload = multer({
  storage,
  limits: { fileSize: POD_MAX_BYTES },
});

module.exports = podUpload;

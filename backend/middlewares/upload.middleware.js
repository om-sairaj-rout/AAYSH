const multer = require("multer");

const storage = multer.memoryStorage(); // store files in memory
const upload = multer({ storage });

module.exports = upload;
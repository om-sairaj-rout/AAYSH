const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

const ENV_PATH = path.join(__dirname, "..", ".env");

const loadEnv = () => {
  if (!fs.existsSync(ENV_PATH)) {
    return;
  }

  const parsed = dotenv.parse(fs.readFileSync(ENV_PATH));

  for (const [key, value] of Object.entries(parsed)) {
    const current = process.env[key];
    if (current === undefined || String(current).trim() === "") {
      process.env[key] = value;
    }
  }
};

module.exports = {
  loadEnv,
  ENV_PATH,
};

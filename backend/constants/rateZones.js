const REST_OF_INDIA_ZONE = "Rest of India";

const RATE_ZONES = [
  "Local NCR",
  "North Zone",
  "Metro",
  REST_OF_INDIA_ZONE,
  "North East",
];

/** Zones admins may assign via pincode Excel upload (Rest of India is implicit). */
const PINCODE_MANAGED_ZONES = [
  "Local NCR",
  "North Zone",
  "Metro",
  "North East",
];

const RATE_SERVICES = ["surface", "air", "prime"];

const SERVICE_LABELS = {
  surface: "SUR (Surface)",
  air: "AIR",
  prime: "PRIME",
};

module.exports = {
  RATE_ZONES,
  REST_OF_INDIA_ZONE,
  PINCODE_MANAGED_ZONES,
  RATE_SERVICES,
  SERVICE_LABELS,
};

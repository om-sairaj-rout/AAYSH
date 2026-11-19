/**
 * Maps Aaysh service types (AWB / rate modes) to Delhivery mot query values.
 * surface → S, air → E, prime → N (per Delhivery docs: S/E/N).
 */
const SERVICE_TYPE_TO_MOT = {
  surface: "S",
  air: "E",
  prime: "N",
};

const resolveDelhiveryMot = (serviceType) => {
  const key = String(serviceType || "surface").trim().toLowerCase();
  return SERVICE_TYPE_TO_MOT[key] || "S";
};

module.exports = {
  SERVICE_TYPE_TO_MOT,
  resolveDelhiveryMot,
};

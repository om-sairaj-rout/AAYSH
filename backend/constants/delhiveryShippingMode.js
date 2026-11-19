/**
 * Maps Aaysh serviceType (surface | air | prime) to Delhivery CMU fields.
 * Defaults follow Delhivery B2C docs: shipping_mode Surface/Express, transport_speed D/F.
 * Override or disable via env without changing UI labels.
 */
const parseEnvMapping = () => {
  const raw = String(process.env.DELHIVERY_SHIPPING_MODE_JSON || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const DEFAULT_MAP = {
  surface: {
    supported: true,
    shipping_mode: "Surface",
    transport_speed: "D",
    label: "Surface (standard)",
  },
  air: {
    supported: true,
    shipping_mode: "Express",
    transport_speed: "D",
    label: "Air (express)",
  },
  prime: {
    supported: true,
    shipping_mode: "Express",
    transport_speed: "F",
    label: "Prime (next-day express)",
  },
};

const resolveDelhiveryShippingMode = (serviceType) => {
  const key = String(serviceType || "").trim().toLowerCase();
  const fromEnv = parseEnvMapping();
  const table = fromEnv && typeof fromEnv === "object" ? fromEnv : DEFAULT_MAP;
  const row = table[key];

  if (!row) {
    return {
      ok: false,
      message: `Unsupported service type "${serviceType}" for Delhivery manifestation.`,
    };
  }

  if (row.supported === false) {
    return {
      ok: false,
      message: `Delhivery manifestation is not enabled for service type "${key}".`,
    };
  }

  const shipping_mode = String(row.shipping_mode || "").trim();
  const transport_speed = String(row.transport_speed || "").trim();

  if (!shipping_mode) {
    return {
      ok: false,
      message: `Delhivery shipping_mode is not configured for "${key}".`,
    };
  }

  return {
    ok: true,
    serviceType: key,
    shipping_mode,
    transport_speed,
    label: row.label || key,
  };
};

module.exports = {
  DEFAULT_MAP,
  resolveDelhiveryShippingMode,
};

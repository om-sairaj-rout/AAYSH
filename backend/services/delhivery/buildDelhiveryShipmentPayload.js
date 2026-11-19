const { resolveDelhiveryShippingMode } = require("../../constants/delhiveryShippingMode");
const { formatProductsDesc } = require("../../utils/delhiveryShipmentHelpers");

const kgToGrams = (kg) => {
  const n = Number(kg);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(1, Math.round(n * 1000));
};

const normalizePhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits.length >= 10 ? digits.slice(-10) : "";
};

const buildConsigneeAddress = (order) => {
  const parts = [order.address, order.address2].filter(Boolean);
  return parts.join(", ").trim();
};

const buildSellerBlock = ({ seller, company, order }) => {
  const sellerName =
    seller?.companyName || company?.companyName || seller?.fullName || "";
  const sellerAdd = seller?.address || company?.address || "";

  return {
    seller_name: String(sellerName || "").slice(0, 200),
    seller_add: String(sellerAdd || "").slice(0, 500),
    seller_inv: String(order?.invoiceNo || "").slice(0, 100),
  };
};

const buildReturnBlock = ({ seller, company }) => {
  const phone = normalizePhone(
    seller?.mobile_number || company?.phone || seller?.phone
  );
  return {
    return_name: String(seller?.companyName || company?.companyName || "").slice(
      0,
      200
    ),
    return_add: String(company?.address || seller?.address || "").slice(
      0,
      500
    ),
    return_city: String(company?.city || seller?.city || "").slice(0, 100),
    return_state: String(company?.state || seller?.state || "").slice(0, 100),
    return_country: String(company?.country || seller?.country || "India").slice(
      0,
      100
    ),
    return_pin: String(company?.zip_code || seller?.zip_code || "").trim(),
    return_phone: phone,
  };
};

const buildBaseShipmentFields = ({
  order,
  seller,
  company,
  serviceType,
  pickupFacilityName,
}) => {
  const mode = resolveDelhiveryShippingMode(serviceType);
  if (!mode.ok) {
    const err = new Error(mode.message);
    err.code = "DELHIVERY_MODE_UNSUPPORTED";
    throw err;
  }

  const phone = normalizePhone(
    order.billingPhone || order.billingAlternatePhone
  );
  if (!phone) {
    const err = new Error("Consignee phone is required for Delhivery.");
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  const pin = String(order.destinationPincode || "").trim();
  if (!/^\d{6}$/.test(pin)) {
    const err = new Error("Valid 6-digit destination pincode is required.");
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  const address = buildConsigneeAddress(order);
  if (!address) {
    const err = new Error("Consignee address is required.");
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  const codAmount = Number(order.invoiceValue);
  if (!Number.isFinite(codAmount) || codAmount < 0) {
    const err = new Error("Valid invoiceValue (COD amount) is required.");
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  const totalAmount = codAmount;
  const products_desc = formatProductsDesc(order);
  const quantity = String(
    (order.orderItems || []).reduce(
      (sum, item) => sum + (Number(item.units) || 0),
      0
    ) || 1
  );

  const sellerBlock = buildSellerBlock({ seller, company, order });
  const returnBlock = buildReturnBlock({ seller, company });

  return {
    mode,
    common: {
      name: String(order.consigneeName || "").trim(),
      add: address,
      pin,
      city: String(order.destinationCity || "").trim(),
      state: String(order.destinationState || "").trim(),
      country: String(order.destinationCountry || "India").trim(),
      phone,
      order: String(order.externalOrderId || order._id).trim(),
      payment_mode: "COD",
      cod_amount: String(codAmount),
      total_amount: String(totalAmount),
      products_desc,
      quantity,
      shipping_mode: mode.shipping_mode,
      ...(mode.transport_speed
        ? { transport_speed: mode.transport_speed }
        : {}),
      address_type: "",
      ...sellerBlock,
      ...returnBlock,
      pickup_location: { name: pickupFacilityName },
    },
  };
};

const buildSpsPayload = ({
  order,
  seller,
  company,
  serviceType,
  pickupFacilityName,
  waybill,
  packageInput,
}) => {
  const { common } = buildBaseShipmentFields({
    order,
    seller,
    company,
    serviceType,
    pickupFacilityName,
  });

  const weightKg =
    packageInput?.weight ??
    order.chargeableWeight ??
    order.weight ??
    order.actualWeight;
  const weightGrams = kgToGrams(weightKg);
  if (!weightGrams) {
    const err = new Error("Package weight is required.");
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  const length = Number(packageInput?.length ?? order.length);
  const width = Number(packageInput?.breadth ?? order.breadth);
  const height = Number(packageInput?.height ?? order.height);

  if (![length, width, height].every((n) => Number.isFinite(n) && n > 0)) {
    const err = new Error(
      "Package dimensions (length, breadth, height in cm) are required."
    );
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  const shipment = {
    ...common,
    waybill,
    weight: String(weightGrams),
    shipment_length: String(Math.round(length)),
    shipment_width: String(Math.round(width)),
    shipment_height: String(Math.round(height)),
  };

  delete shipment.pickup_location;

  return {
    pickup_location: { name: pickupFacilityName },
    shipments: [shipment],
  };
};

const buildMpsPayload = ({
  order,
  seller,
  company,
  serviceType,
  pickupFacilityName,
  reservedAwbs,
  packageInputs,
}) => {
  const { common } = buildBaseShipmentFields({
    order,
    seller,
    company,
    serviceType,
    pickupFacilityName,
  });

  const boxCount = packageInputs.length;
  if (boxCount < 2) {
    const err = new Error("MPS requires at least 2 packages.");
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  if (reservedAwbs.length !== boxCount) {
    const err = new Error("MPS requires one reserved AWB per package.");
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  const masterAwb = reservedAwbs[0].awbNumber;
  const mpsChildren = String(boxCount);
  const mpsAmount = String(
    Math.round(
      packageInputs.reduce(
        (sum, pkg) => sum + (Number(pkg.codAmount) || 0),
        0
      ) * 100
    ) / 100
  );

  const shipments = packageInputs.map((pkg, index) => {
    const weightGrams = kgToGrams(
      pkg.weight ?? order.chargeableWeight ?? order.weight
    );
    if (!weightGrams) {
      const err = new Error(`Package ${index + 1} weight is required.`);
      err.code = "VALIDATION_ERROR";
      throw err;
    }

    const length = Number(pkg.length ?? order.length);
    const width = Number(pkg.breadth ?? order.breadth);
    const height = Number(pkg.height ?? order.height);
    if (![length, width, height].every((n) => Number.isFinite(n) && n > 0)) {
      const err = new Error(
        `Package ${index + 1} dimensions (cm) are required for MPS.`
      );
      err.code = "VALIDATION_ERROR";
      throw err;
    }

    const pkgCod = Number(
      pkg.codAmount ??
        (Number(order.invoiceValue) / boxCount).toFixed(2)
    );

    return {
      ...common,
      waybill: reservedAwbs[index].awbNumber,
      shipment_type: "MPS",
      master_id: masterAwb,
      mps_children: mpsChildren,
      mps_amount: mpsAmount,
      weight: String(weightGrams),
      shipment_length: String(Math.round(length)),
      shipment_width: String(Math.round(width)),
      shipment_height: String(Math.round(height)),
      cod_amount: String(pkgCod),
      total_amount: String(pkgCod),
    };
  });

  shipments.forEach((row) => {
    delete row.pickup_location;
  });

  return {
    pickup_location: { name: pickupFacilityName },
    shipments,
  };
};

module.exports = {
  buildSpsPayload,
  buildMpsPayload,
  normalizePhone,
  kgToGrams,
};

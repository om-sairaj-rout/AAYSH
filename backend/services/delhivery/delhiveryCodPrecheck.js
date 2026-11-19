const { resolveDelhiveryMot } = require("../../constants/delhiveryMot");
const { isDelhiveryCodCheckEnabled } = require("../../config/delhiveryConfig");
const { resolveDelhiveryOriginPin } = require("../../utils/resolveDelhiveryOriginPin");
const { checkDelhiveryPincodeServiceability } = require("./resolveDelhiveryServiceability");
const { getDelhiveryServiceabilityProductType } = require("../../config/delhiveryConfig");
const { fetchExpectedTat } = require("./delhiveryExpectedTat");

const runDelhiveryCodPrecheck = async ({
  destinationPincode,
  companyID,
  paymentMethod,
  serviceType = "surface",
  expectedPickupDate,
  delhiveryProductType,
}) => {
  const payment = String(paymentMethod || "").trim();
  if (payment !== "COD") {
    return {
      skipped: true,
      courier: "Trackon",
      message: "Prepaid orders use Trackon; Delhivery check not applicable.",
    };
  }

  if (!isDelhiveryCodCheckEnabled()) {
    return {
      skipped: true,
      courier: "Delhivery",
      message:
        "Delhivery COD check is not enabled (missing token or DELHIVERY_COD_CHECK_ENABLED=false).",
    };
  }

  const destination = String(destinationPincode || "").replace(/\D/g, "");
  const productType = getDelhiveryServiceabilityProductType(delhiveryProductType);
  const serviceability = await checkDelhiveryPincodeServiceability(
    destination,
    productType
  );

  if (serviceability.api_error) {
    return {
      ok: false,
      payment_method: "COD",
      courier: "Delhivery",
      delhivery_product_type: productType,
      can_proceed: false,
      serviceability,
      tat: null,
      message: serviceability.message,
    };
  }

  if (!serviceability.serviceable || !serviceability.cod_available) {
    return {
      ok: true,
      payment_method: "COD",
      courier: "Delhivery",
      delhivery_product_type: productType,
      can_proceed: false,
      serviceability,
      tat: null,
      message: serviceability.message,
    };
  }

  const originResult = await resolveDelhiveryOriginPin(companyID);
  const mot = resolveDelhiveryMot(serviceType);

  if (!originResult.originPin) {
    return {
      ok: false,
      payment_method: "COD",
      courier: "Delhivery",
      delhivery_product_type: productType,
      can_proceed: false,
      serviceability,
      tat: {
        ok: false,
        api_error: true,
        error_code: "MISSING_ORIGIN_PIN",
        message: originResult.message,
      },
      message: originResult.message,
    };
  }

  const tat = await fetchExpectedTat({
    originPin: originResult.originPin,
    destinationPin: destination,
    mot,
    pdt: productType === "Heavy" ? "Heavy" : "B2C",
    expectedPickupDate,
  });

  if (tat.api_error) {
    return {
      ok: true,
      payment_method: "COD",
      courier: "Delhivery",
      delhivery_product_type: productType,
      can_proceed: true,
      serviceability,
      tat,
      origin_pin: originResult.originPin,
      origin_pin_source: originResult.source,
      mot,
      message:
        "Pincode is serviceable for Delhivery COD. TAT could not be retrieved.",
    };
  }

  return {
    ok: true,
    payment_method: "COD",
    courier: "Delhivery",
    delhivery_product_type: productType,
    can_proceed: true,
    serviceability,
    tat,
    origin_pin: originResult.originPin,
    origin_pin_source: originResult.source,
    mot,
    message: tat.message || "Delhivery COD serviceability confirmed.",
  };
};

module.exports = {
  runDelhiveryCodPrecheck,
};

const { getDelhiveryServiceabilityProductType } = require("../../config/delhiveryConfig");
const { checkB2CPincodeServiceability } = require("./delhiveryServiceability");
const { checkHeavyPincodeServiceability } = require("./delhiveryHeavyServiceability");

const checkDelhiveryPincodeServiceability = async (
  destinationPin,
  productTypeOverride
) => {
  const productType = getDelhiveryServiceabilityProductType(productTypeOverride);

  if (productType === "Heavy") {
    return checkHeavyPincodeServiceability(destinationPin);
  }

  return checkB2CPincodeServiceability(destinationPin);
};

module.exports = {
  checkDelhiveryPincodeServiceability,
};

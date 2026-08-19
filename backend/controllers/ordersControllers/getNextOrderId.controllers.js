const {
  ORDER_ID_SEQUENCES,
  ORDER_ID_SEQUENCE_IDS,
} = require("../../constants/orderIdSequences");
const { getNextOrderIdPreview } = require("../../utils/generateOrderId");

const getOrderIdSequencesController = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      sequences: ORDER_ID_SEQUENCE_IDS.map((id) => ({
        id,
        label: ORDER_ID_SEQUENCES[id].label,
        description: ORDER_ID_SEQUENCES[id].description,
        example: ORDER_ID_SEQUENCES[id].format(ORDER_ID_SEQUENCES[id].startAt),
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getNextOrderIdController = async (req, res) => {
  try {
    const sequenceType = String(req.query.sequence || "alphanumeric")
      .trim()
      .toLowerCase();

    let companyID = String(
      req.query.companyId ||
        req.query.companyID ||
        req.user.companyID ||
        ""
    )
      .trim()
      .toUpperCase();

    if (req.user.role !== "admin") {
      companyID = String(req.user.companyID || "").trim().toUpperCase();
    }

    if (!companyID) {
      return res.status(400).json({
        success: false,
        message: "companyId is required",
      });
    }

    const preview = await getNextOrderIdPreview(companyID, sequenceType);

    return res.status(200).json({
      success: true,
      ...preview,
      label: ORDER_ID_SEQUENCES[preview.sequenceType]?.label,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getOrderIdSequencesController,
  getNextOrderIdController,
};

const Courier = require("../../models/awb/courier.model");
const Awb = require("../../models/awb/awb.model");

const ALLOWED_CATEGORIES = ["under3kg", "over3kg", "prime", "codToPay"];

const getCourierAwbs = async (req, res) => {
  try {
    const { courierId } = req.params;
    const category = String(req.query.category || "").trim();

    const courier = await Courier.findById(courierId).lean();
    if (!courier) {
      return res.status(404).json({
        success: false,
        message: "Courier not found",
      });
    }

    const filter = { courierId: courier._id };
    if (category) {
      if (!ALLOWED_CATEGORIES.includes(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid AWB category",
        });
      }
      filter.category = category;
    }

    const awbs = await Awb.find(filter).sort({ createdAt: -1 }).lean();

    return res.json({
      success: true,
      courier,
      category: category || "all",
      awbs,
      count: awbs.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = getCourierAwbs;

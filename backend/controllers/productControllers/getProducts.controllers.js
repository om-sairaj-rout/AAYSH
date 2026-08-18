const Product = require("../../models/product.model");
const { applyCompanyProductFilter } = require("../../utils/productScope");

const getProducts = async (req, res) => {
  try {
    const filter = applyCompanyProductFilter(req, { isActive: true });

    if (req.query.includeInactive === "true" && req.user.role === "admin") {
      delete filter.isActive;
    }

    const search = String(req.query.search || "").trim();
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: regex }, { sku: regex }, { description: regex }];
    }

    const products = await Product.find(filter)
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      products,
      total: products.length,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = getProducts;

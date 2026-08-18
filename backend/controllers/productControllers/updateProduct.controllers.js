const Product = require("../../models/product.model");
const { userOwnsProduct } = require("../../utils/productScope");

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (!userOwnsProduct(product, req)) {
      return res.status(403).json({ message: "Forbidden access" });
    }

    const fields = [
      "name",
      "sku",
      "description",
      "sellingPrice",
      "discount",
      "tax",
      "hsn",
      "weight",
      "length",
      "breadth",
      "height",
      "defaultUnits",
      "isActive",
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (["name", "sku", "description", "hsn"].includes(field)) {
          product[field] = String(req.body[field]).trim();
        } else if (field === "defaultUnits") {
          product.defaultUnits = Math.max(1, Number(req.body[field]) || 1);
        } else if (field === "tax") {
          const taxPercent = Number(req.body[field]) || 0;
          if (taxPercent < 0 || taxPercent > 100) {
            return res.status(400).json({
              message: "Tax must be between 0 and 100 percent",
            });
          }
          product.tax = taxPercent;
        } else if (field === "isActive") {
          product.isActive = Boolean(req.body.isActive);
        } else {
          product[field] = Number(req.body[field]) || 0;
        }
      }
    });

    if (!product.name) {
      return res.status(400).json({ message: "Product name is required" });
    }

    if (product.sku) {
      const duplicate = await Product.findOne({
        _id: { $ne: product._id },
        companyID: product.companyID,
        sku: product.sku,
        isActive: true,
      });

      if (duplicate) {
        return res.status(400).json({
          message: "Another active product already uses this SKU",
        });
      }
    }

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product updated",
      product,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = updateProduct;

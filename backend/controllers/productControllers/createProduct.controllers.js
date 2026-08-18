const Product = require("../../models/product.model");

const createProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      description,
      sellingPrice,
      discount,
      tax,
      hsn,
      weight,
      length,
      breadth,
      height,
      defaultUnits,
      companyID: bodyCompanyID,
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Product name is required" });
    }

    let companyID = req.user.companyID;

    if (req.user.role === "admin" && bodyCompanyID) {
      companyID = String(bodyCompanyID).trim().toUpperCase();
    }

    if (!companyID) {
      return res.status(400).json({
        message: "Company ID is required to create a catalog product",
      });
    }

    if (sku) {
      const duplicate = await Product.findOne({
        companyID,
        sku: String(sku).trim(),
        isActive: true,
      });

      if (duplicate) {
        return res.status(400).json({
          message: "A product with this SKU already exists in the catalog",
        });
      }
    }

    const taxPercent = Number(tax) || 0;
    if (taxPercent < 0 || taxPercent > 100) {
      return res.status(400).json({
        message: "Tax must be between 0 and 100 percent",
      });
    }

    const product = await Product.create({
      companyID,
      createdBy: req.user.id,
      name: String(name).trim(),
      sku: String(sku || "").trim(),
      description: String(description || "").trim(),
      sellingPrice: Number(sellingPrice) || 0,
      discount: Number(discount) || 0,
      tax: taxPercent,
      hsn: String(hsn || "").trim(),
      weight: Number(weight) || 0,
      length: Number(length) || 0,
      breadth: Number(breadth) || 0,
      height: Number(height) || 0,
      defaultUnits: Math.max(1, Number(defaultUnits) || 1),
    });

    return res.status(201).json({
      success: true,
      message: "Product added to catalog",
      product,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = createProduct;

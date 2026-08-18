const Product = require("../../models/product.model");
const { userOwnsProduct } = require("../../utils/productScope");

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (!userOwnsProduct(product, req)) {
      return res.status(403).json({ message: "Forbidden access" });
    }

    product.isActive = false;
    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product removed from catalog",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = deleteProduct;

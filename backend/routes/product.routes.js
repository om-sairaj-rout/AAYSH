const express = require("express");
const productRouter = express.Router();
const { checkAuth, checkPermission } = require("../middlewares/auth.middleware");
const getProducts = require("../controllers/productControllers/getProducts.controllers");
const createProduct = require("../controllers/productControllers/createProduct.controllers");
const updateProduct = require("../controllers/productControllers/updateProduct.controllers");
const deleteProduct = require("../controllers/productControllers/deleteProduct.controllers");

productRouter.get("/products", checkAuth, checkPermission("orders", "read"), getProducts);
productRouter.post("/products", checkAuth, checkPermission("orders", "write"), createProduct);
productRouter.put("/products/:id", checkAuth, checkPermission("orders", "write"), updateProduct);
productRouter.delete("/products/:id", checkAuth, checkPermission("orders", "write"), deleteProduct);

module.exports = productRouter;

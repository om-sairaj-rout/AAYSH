const express = require("express");
const productRouter = express.Router();
const { checkAuth } = require("../middlewares/auth.middleware");
const getProducts = require("../controllers/productControllers/getProducts.controllers");
const createProduct = require("../controllers/productControllers/createProduct.controllers");
const updateProduct = require("../controllers/productControllers/updateProduct.controllers");
const deleteProduct = require("../controllers/productControllers/deleteProduct.controllers");

productRouter.get("/products", checkAuth, getProducts);
productRouter.post("/products", checkAuth, createProduct);
productRouter.put("/products/:id", checkAuth, updateProduct);
productRouter.delete("/products/:id", checkAuth, deleteProduct);

module.exports = productRouter;

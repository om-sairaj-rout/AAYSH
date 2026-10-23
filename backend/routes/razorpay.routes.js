const express = require("express");
const razorpayRouter = express.Router();
const { checkAuth } = require("../middlewares/auth.middleware");
const {
  createOrder,
  verifyPayment,
} = require("../controllers/razorpayCheckout.controllers");

razorpayRouter.post("/create-order", checkAuth, createOrder);
razorpayRouter.post("/verify-payment", checkAuth, verifyPayment);

module.exports = razorpayRouter;

const mongoose = require("mongoose");

const companyCounterSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: "companyId",
  },
  seq: {
    type: Number,
    default: 0,
  },
});

module.exports =
  mongoose.models.CompanyCounter ||
  mongoose.model("CompanyCounter", companyCounterSchema);

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minLength: 3,
    maxLength: 20,
  },
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minLength: 6,
  },
  mobile_number: {
    type: String,
    required: true,
    unique: true,
  },
  company_name: {
    type: String,
    reuired: true,
  },
  gender: {
    type: String,
    enum: ["Male", "Female", "others"],
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  zip_code: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
}, {
  timestamps: true,
});

const User = mongoose.model("User", userSchema);

module.exports = User;

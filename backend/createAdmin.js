const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/user.model");

mongoose.connect("mongodb+srv://omsairajrout:omsairajrout123@cluster0.douriuv.mongodb.net/aaysh");

const createAdmin = async () => {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  await User.create({
    username: "admin",
    email: "admin@gmail.com",
    password: hashedPassword,
    mobile_number: "9999999999",
    company_name: "FastDelivery",
    gender: "Male",
    address: "Noida",
    zip_code: "201301",
    city: "Noida",
    state: "UP",
    country: "India",
    role: "admin"
  });

  console.log("Admin created: admin@gmail.com / admin123");
  process.exit();
};

createAdmin();
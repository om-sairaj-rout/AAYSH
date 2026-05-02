const User = require('../../models/User.model');
const bcrypt = require('bcrypt');

const RegisterController = async (req, res) => {
  const { username, email, password, mobile_number, company_name, gender, address, zip_code, city, state, country } = req.body;

  if (!username || username.length < 3) {
    return res.status(400).json({ message: "Username must contain at least 3 letters." });
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: "Invalid email" }); 
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ message: "Password must contain at least 6 letters." });
  }

  const existingUser = await User.findOne({ $or: [{ email }, { mobile_number }] });
  if (existingUser) {
    return res.status(400).json({ 
      message: "User already exists with this email",
    });
  }

  const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = new User({
    username,
    email,
    password : hashedPassword,
    mobile_number,
    company_name, gender, address, zip_code, city, state, country
  });
  
  const newuser = await newUser.save()
  if(!newuser) {
    return res.status(500).json({
      message: "Error saving user to database",
    });
  }
  return res.status(201).json({
    message: "User registered successfully",
    user: {
      id: newuser._id,
      username: newuser.username,
      email: newuser.email,
    },
  });
};

module.exports = RegisterController;
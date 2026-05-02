const express = require('express');
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

dotenv.config();

const connectToDB = require("./config/db");
const authRouter = require('./routes/auth.routes');

connectToDB();

const app = express();

app.use(cookieParser());
app.use(cors({
  origin: [
    "http://localhost:5173"
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', authRouter);

app.listen(3000, () => {
    console.log('Server is running on port 3000');
})
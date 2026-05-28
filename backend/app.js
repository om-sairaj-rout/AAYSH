const express = require('express');
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

dotenv.config();

const connectToDB = require("./config/db");
const authRouter = require('./routes/auth.routes');
const uploadRouter = require('./routes/upload.routes');
const orderRouter = require('./routes/order.routes');
const dashboardRouter = require('./routes/dashboard.routes');
const adminStatusUpdateRouter = require('./routes/adminStatusUpdate.routes');
const courierRouter = require('./routes/courier.routes');
const assignAwbRouter = require('./routes/assignAwb.routes');
const generateLabelRouter = require('./routes/labelGeneration.routes');
const contactRouter = require('./routes/contact.routes');

connectToDB();

const app = express();

app.use(cookieParser());
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://aaysh.onrender.com",
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', authRouter);
app.use('/api', uploadRouter);
app.use('/api', orderRouter);
app.use('/api', dashboardRouter);
app.use('/api/admin', adminStatusUpdateRouter);
app.use('/api', courierRouter);
app.use('/api', assignAwbRouter);
app.use('/api', generateLabelRouter);
app.use('/api', contactRouter)

require("./utils/cron/cleanupOrders");

app.listen(3000, () => {
    console.log('Server is running on port 3000');
})
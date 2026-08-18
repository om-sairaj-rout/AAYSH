const path = require("path");
const express = require('express');
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

dotenv.config();

const connectToDB = require("./config/db");
const authRouter = require('./routes/auth.routes');
const companyRouter = require('./routes/company.routes');
const uploadRouter = require('./routes/upload.routes');
const orderRouter = require('./routes/order.routes');
const dashboardRouter = require('./routes/dashboard.routes');
const courierRouter = require('./routes/courier.routes');
const assignAwbRouter = require('./routes/assignAwb.routes');
const generateLabelRouter = require('./routes/labelGeneration.routes');
const contactRouter = require('./routes/contact.routes');
const shipmentRouter = require('./routes/shipment.routes');
const trackingRouter = require('./routes/tracking.routes');
const pickupRouter = require('./routes/pickupRoute.controllers');
const productRouter = require('./routes/product.routes');
const reversePickupRouter = require('./routes/reversePickup.routes');
const ticketRouter = require('./routes/ticket.routes');

connectToDB();

const app = express();

app.use(cookieParser());
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  next();
});
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://aaysh.vercel.app",
    "https://www.aayshexpress.com",
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

require("./cron/pickupCron");

// Public AWB tracking (no login) — registered before authenticated routers
const getOrderByAwbController = require("./controllers/ordersControllers/getOrdersByAwb.controllers");
app.get("/api/public/orders/awb/:awbNumber", getOrderByAwbController);
app.get("/api/orders/awb/:awbNumber", getOrderByAwbController);

app.use('/api', authRouter);
app.use('/api', companyRouter);
app.use('/api', shipmentRouter);
app.use('/api', trackingRouter);
app.use('/api', pickupRouter);
app.use('/api', uploadRouter);
app.use('/api', orderRouter);
app.use('/api', productRouter);
app.use('/api', reversePickupRouter);
app.use('/api', ticketRouter);
app.use('/api', dashboardRouter);
app.use('/api', courierRouter);
app.use('/api', assignAwbRouter);
app.use('/api', generateLabelRouter);
app.use('/api', contactRouter)


app.listen(3000, () => {
    console.log('Server is running on port 3000');
})
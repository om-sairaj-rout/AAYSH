const mongoose = require("mongoose");

const dropLegacyUserIndexes = async () => {
  try {
    const collection = mongoose.connection.collection("users");
    const indexes = await collection.indexes();

    const legacyCompanyNameIndex = indexes.find(
      (index) => index.name === "companyName_1" && index.unique
    );

    if (legacyCompanyNameIndex) {
      await collection.dropIndex("companyName_1");
      console.log(
        "Removed legacy unique index on users.companyName (multiple users per company are allowed)"
      );
    }

    const legacyUsernameIndex = indexes.find(
      (index) => index.name === "username_1"
    );

    if (legacyUsernameIndex) {
      await collection.dropIndex("username_1");
      console.log("Removed unused username index from users collection");
    }

    const legacyCompanyIdIndex = indexes.find(
      (index) => index.name === "companyID_1" && index.unique
    );

    if (legacyCompanyIdIndex) {
      await collection.dropIndex("companyID_1");
      console.log(
        "Removed legacy unique index on users.companyID (multiple users per company are allowed)"
      );
    }
  } catch (error) {
    if (error.codeName !== "IndexNotFound") {
      console.warn("Legacy user index cleanup skipped:", error.message);
    }
  }
};

const ensureCompanyIndexes = async () => {
  try {
    const Company = require("../models/company.model");
    await Company.syncIndexes();
  } catch (error) {
    console.warn("Company index sync warning:", error.message);
  }
};

const dropLegacyOrderIndexes = async () => {
  try {
    const collection = mongoose.connection.collection("orders");
    const indexes = await collection.indexes();

    const compoundIndex = indexes.find(
      (index) => index.name === "companyID_1_externalOrderId_1"
    );

    if (compoundIndex) {
      await collection.dropIndex("companyID_1_externalOrderId_1");
      console.log(
        "Removed per-company unique index on orders (order IDs are globally unique)"
      );
    }
  } catch (error) {
    if (error.codeName !== "IndexNotFound") {
      console.warn("Legacy order index cleanup skipped:", error.message);
    }
  }
};

const ensureOrderIndexes = async () => {
  try {
    const Order = require("../models/upload/order.model");
    await Order.syncIndexes();
  } catch (error) {
    console.warn("Order index sync warning:", error.message);
  }
};

const ensureUserIndexes = async () => {
  try {
    const User = require("../models/user.model");
    await User.syncIndexes();
  } catch (error) {
    console.warn("User index sync warning:", error.message);
  }
};

function connectToDB() {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(async () => {
      console.log("database is connected");
      await dropLegacyUserIndexes();
      await ensureUserIndexes();
      await ensureCompanyIndexes();
      await dropLegacyOrderIndexes();
      await ensureOrderIndexes();
      const { syncCompanyCounter } = require("../utils/generateCompanyId");
      await syncCompanyCounter();
    })
    .catch((err) => {
      console.error("DB connection error:", err.message);
    });
}

module.exports = connectToDB;

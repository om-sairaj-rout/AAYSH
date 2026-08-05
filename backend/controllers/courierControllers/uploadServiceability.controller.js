const xlsx = require("xlsx");

const Courier = require("../../models/awb/courier.model");
const PincodeServiceability = require("../../models/upload/serviceability.model");

const getCategory = require("../../utils/categoryMapper");

const uploadPincodeServiceability = async (req, res) => {
  try {
    // =====================================
    // Validation
    // =====================================

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required.",
      });
    }

    const { courierId } = req.body;

    if (!courierId) {
      return res.status(400).json({
        success: false,
        message: "courierId is required.",
      });
    }

    // =====================================
    // Courier
    // =====================================

    const courier = await Courier.findById(courierId);

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: "Courier not found.",
      });
    }

    // =====================================
    // Read Excel
    // =====================================

    const workbook = xlsx.read(req.file.buffer, {
      type: "buffer",
    });

    const sheet =
      workbook.Sheets[workbook.SheetNames[0]];

    const rows = xlsx.utils.sheet_to_json(sheet);

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "Excel file is empty.",
      });
    }

    let created = 0;
    let updated = 0;
    let totalPincodes = 0;
let surfaceCount = 0;
let airCount = 0;
let primeCount = 0;

// Remove old serviceability of this courier before importing fresh sheet
await PincodeServiceability.updateMany(
  {},
  {
    $pull: {
      couriers: {
        courierId: courier._id,
      },
    },
  }
);

    // =====================================
    // Process Rows
    // =====================================

    for (const row of rows) {
      const pincode = String(
  row["Pincode"] ??
  row["PINCODE"] ??
  row["pincode"] ??
  ""
).trim();

      if (!pincode) {
        continue;
      }

      const city = String(
  row["City"] ?? row["CITY"] ?? row["city"] ?? ""
).trim();

const state = String(
  row["State"] ?? row["STATE"] ?? row["state"] ?? ""
).trim();

      // ============================
      // Zone
      // ============================

      const zone = getCategory(city, state);

      // ============================
      // Prime
      // ============================

      const primeValue = String(
  row["Prime"] ??
  row["PRIME"] ??
  row["prime"] ??
  ""
)
.trim()
.toUpperCase();

      const prime =
        primeValue === "Y" ||
        primeValue === "YES";

      // ============================
      // Surface
      // ============================

      const surface = true;

      // ============================
      // Air
      // ============================

      let air = true;

      if (
  zone === "Local NCR" ||
  zone === "North Zone"
) {
  air = false;
}

      // Jammu & Kashmir Exception

      const normalizedState =
        state.toLowerCase().trim();

      if (
        normalizedState ===
          "jammu & kashmir" ||
        normalizedState ===
          "jammu and kashmir"
      ) {
        air = true;
      }

      totalPincodes++;

if (surface) surfaceCount++;

if (air) airCount++;

if (prime) primeCount++;

      // ============================
      // Find Existing Pincode
      // ============================

      let serviceability =
        await PincodeServiceability.findOne({
          pincode,
        }).lean();

      // ============================
      // Create New
      // ============================

      if (!serviceability) {
        serviceability =
          await PincodeServiceability.create({
            pincode,

            zone,

            couriers: [
              {
                courierId: courier._id,
                courierName: courier.name,

                prime,
                surface,
                air,
              },
            ],
          });

        created++;
        continue;
      }

      // ============================
      // Update Existing Courier
      // ============================

      const courierIndex =
        serviceability.couriers.findIndex(
          (c) =>
            c.courierId.toString() ===
            courier._id.toString()
        );

      if (courierIndex >= 0) {
        serviceability.couriers[
          courierIndex
        ].prime = prime;

        serviceability.couriers[
          courierIndex
        ].surface = surface;

        serviceability.couriers[
          courierIndex
        ].air = air;

        serviceability.couriers[
          courierIndex
        ].courierName = courier.name;
      } else {
        serviceability.couriers.push({
          courierId: courier._id,
          courierName: courier.name,

          prime,
          surface,
          air,
        });
      }

      await serviceability.save();

      updated++;
    }

    // Remove pincodes that no longer have any courier
await PincodeServiceability.deleteMany({
  couriers: { $size: 0 },
});

// Update courier statistics
await Courier.findByIdAndUpdate(courier._id, {
  totalPincodes,
  surfacePincodesCount: surfaceCount,
  airPincodesCount: airCount,
  primePincodesCount: primeCount,
});

    // =====================================
    // Response
    // =====================================

    return res.status(200).json({
      success: true,
      message:
        "Pincode serviceability uploaded successfully.",

      totalRows: rows.length,
      created,
      updated,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        "Failed to upload serviceability.",
      error: error.message,
    });
  }
};

module.exports = uploadPincodeServiceability;
const XLSX = require("xlsx");
const Awb = require("../../models/awb/awb.model");

const uploadAwbSheet = async (req, res) => {
  try {
    const { courierId, category } = req.body;
    const allowedCategories = ["under3kg", "over3kg", "prime", "codToPay"];

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid AWB category",
      });
    }
    console.log("COURIER ID:", courierId, "CATEGORY:", category);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File required",
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
        defval: "",
        blankrows: false,
    });

    const unique = new Set();
    let inserted = 0;

    for (let i = 0; i < rows.length; i++) {
      const awb = String(rows[i][0] || "").trim();

      if (!awb) continue;
      
      if (unique.has(awb)) continue;
      unique.add(awb);

      const exists = await Awb.exists({ awbNumber: awb });

      if (exists) continue;

      await Awb.create({
        courierId,
        category,
        awbNumber: awb,
        status: "available",
      });

      inserted++;
    }

    return res.json({
      success: true,
      inserted,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = uploadAwbSheet;
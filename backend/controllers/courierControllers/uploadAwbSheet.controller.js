const XLSX = require("xlsx");

const Awb =
  require("../../models/awb/awb.model");

const uploadAwbSheet =
  async (req, res) => {
    try {
      const {
        courierId,
        category,
      } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "File required",
        });
      }

      const workbook =
        XLSX.read(
          req.file.buffer,
          {
            type: "buffer",
          }
        );

      const sheet =
        workbook.Sheets[
          workbook.SheetNames[0]
        ];

      const rows =
        XLSX.utils.sheet_to_json(
          sheet,
          {
            header: 1,
          }
        );

      let inserted = 0;

      for (
        let i = 1;
        i < rows.length;
        i++
      ) {
        const awb =
          String(
            rows[i][0]
          ).trim();

        if (!awb) continue;

        const exists =
          await Awb.findOne({
            awbNumber:
              awb,
          });

        if (!exists) {
          await Awb.create({
            courierId,
            category,
            awbNumber: awb,
          });

          inserted++;
        }
      }

      res.json({
        success: true,
        count: inserted,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

module.exports =
  uploadAwbSheet;
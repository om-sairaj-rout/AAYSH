const Courier =
  require("../../models/awb/courier.model");

const addCourier =
  async (req, res) => {
    try {
      const { name } = req.body;

      const exists =
        await Courier.findOne({
          name,
        }); 

      if (exists) {
        return res.status(400).json({
          success: false,
          message:
            "Courier already exists",
        });
      }

      const courier =
        await Courier.create({
          name,
        });

      res.json({
        success: true,
        courier,
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
  addCourier;
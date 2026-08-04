const axios = require("axios");

const sendWhatsApp = async (to, templateName, parameters = []) => {
  try {
    if (
      !process.env.WHATSAPP_ACCESS_TOKEN ||
      !process.env.WHATSAPP_PHONE_NUMBER_ID
    ) {
      console.log("WhatsApp not configured");
      return;
    }

    await axios.post(
      `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: "en"
          },
          components: [
            {
              type: "body",
              parameters
            }
          ]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("WhatsApp sent");
  } catch (err) {
    console.log(
      err.response?.data || err.message
    );
  }
};

module.exports = sendWhatsApp;
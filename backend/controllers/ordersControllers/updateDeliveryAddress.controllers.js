const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const { validateOptionalPhone } = require("../../utils/phone");

const updateCustomerDeliveryAddress = async (req, res) => {
  try {
    const {
      order_id,
      shipping_customer_name,
      shipping_phone,
      shipping_address,
      shipping_address_2,
      shipping_city,
      shipping_state,
      shipping_country,
      shipping_pincode,
      shipping_email,
      billing_alternate_phone,
    } = req.body;

    // ===========================
    // Validation
    // ===========================

    if (
  !order_id ||
  !shipping_customer_name ||
  !shipping_address ||
  !shipping_city ||
  !shipping_state ||
  !shipping_country ||
  !shipping_pincode
) {
  return res.status(400).json({
    success: false,
    message:
      "Required fields: order_id, shipping_customer_name, shipping_address, shipping_city, shipping_state, shipping_country, shipping_pincode.",
  });
}

    if (shipping_phone !== undefined && shipping_phone !== null) {
      const phoneCheck = validateOptionalPhone(
        shipping_phone,
        "Customer phone number"
      );
      if (!phoneCheck.ok) {
        return res.status(400).json({
          success: false,
          message: phoneCheck.message,
        });
      }
    }

    if (billing_alternate_phone !== undefined && billing_alternate_phone !== null) {
      const alternatePhoneCheck = validateOptionalPhone(
        billing_alternate_phone,
        "Alternate phone number"
      );
      if (!alternatePhoneCheck.ok) {
        return res.status(400).json({
          success: false,
          message: alternatePhoneCheck.message,
        });
      }
    }

    const order = await Order.findOne({
      externalOrderId: order_id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    // Optional: Don't allow address update after shipment starts

    const shipping = await Shipping.findOne({
      orderId: order._id,
    });

    // Allow address update only before shipment starts
if (shipping) {
  const allowedStatuses = ["Pending", "Booked"];

  if (!allowedStatuses.includes(shipping.shippingStatus)) {
    return res.status(400).json({
      success: false,
      message: `Customer delivery address cannot be updated when shipping status is '${shipping.shippingStatus}'. Only Pending or Booked orders can be updated.`,
    });
  }
}

    // ===========================
    // Update Fields
    // ===========================

    if (shipping_customer_name !== undefined)
      order.consigneeName = shipping_customer_name;

    if (shipping_phone !== undefined) {
      const phoneCheck = validateOptionalPhone(
        shipping_phone,
        "Customer phone number"
      );
      if (!phoneCheck.ok) {
        return res.status(400).json({
          success: false,
          message: phoneCheck.message,
        });
      }
      order.billingPhone = phoneCheck.value;
    }

    if (shipping_address !== undefined)
      order.address = shipping_address;

    if (shipping_address_2 !== undefined)
      order.address2 = shipping_address_2;

    if (shipping_city !== undefined)
      order.destinationCity = shipping_city;

    if (shipping_state !== undefined)
      order.destinationState = shipping_state;

    if (shipping_country !== undefined)
      order.destinationCountry = shipping_country;

    if (shipping_pincode !== undefined)
      order.destinationPincode = shipping_pincode;

    if (shipping_email !== undefined)
      order.consigneeEmail = shipping_email;

    if (billing_alternate_phone !== undefined) {
      const alternatePhoneCheck = validateOptionalPhone(
        billing_alternate_phone,
        "Alternate phone number"
      );
      if (!alternatePhoneCheck.ok) {
        return res.status(400).json({
          success: false,
          message: alternatePhoneCheck.message,
        });
      }
      order.billingAlternatePhone = alternatePhoneCheck.value;
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Customer delivery address updated successfully.",
      order_id: order.externalOrderId,
      updated_address: {
        customer_name: order.consigneeName,
        phone: order.billingPhone,
        address: order.address,
        address_2: order.address2,
        city: order.destinationCity,
        state: order.destinationState,
        country: order.destinationCountry,
        pincode: order.destinationPincode,
        email: order.consigneeEmail,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to update customer delivery address.",
    });
  }
};

module.exports = updateCustomerDeliveryAddress;
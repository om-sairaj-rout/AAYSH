const getItemLineTotal = (item = {}) => {
  const qty = Number(item.units || 1);
  const price = Number(item.sellingPrice ?? item.selling_price ?? 0);
  const discount = Number(item.discount || 0);
  const tax = Number(item.tax || 0);

  const taxable = price * qty - discount;
  const gst = taxable * (tax / 100);

  return taxable + gst;
};

const calculateItemsSubTotal = (orderItems = []) =>
  Number(
    orderItems
      .reduce((sum, item) => sum + getItemLineTotal(item), 0)
      .toFixed(2)
  );

const calculateInvoiceValue = ({
  orderItems = [],
  shippingCharges = 0,
  giftwrapCharges = 0,
  transactionCharges = 0,
}) =>
  Number(
    (
      calculateItemsSubTotal(orderItems) +
      Number(shippingCharges || 0) +
      Number(giftwrapCharges || 0) +
      Number(transactionCharges || 0)
    ).toFixed(2)
  );

module.exports = {
  getItemLineTotal,
  calculateItemsSubTotal,
  calculateInvoiceValue,
};

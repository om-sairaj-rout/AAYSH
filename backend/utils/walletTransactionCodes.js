const buildWalletTransactionCode = (prefix, id) =>
  `${prefix}${String(id).replace(/\W/g, "").toUpperCase()}`;

const buildMtxCode = (id) => buildWalletTransactionCode("MTX", id);
const buildMrcCode = (id) => buildWalletTransactionCode("MRC", id);

module.exports = {
  buildWalletTransactionCode,
  buildMtxCode,
  buildMrcCode,
};

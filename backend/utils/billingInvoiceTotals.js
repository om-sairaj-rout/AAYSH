const { amountInWords } = require("./amountInWords");

const round2 = (value) => Number(Number(value || 0).toFixed(2));

const lineFreightAmount = (line) =>
  Number(line.amount ?? line.breakdown?.weightSlabRate ?? 0) || 0;

const lineDocketCharge = (line) =>
  Number(
    line.docChg ??
      line.docketChg ??
      (Number(line.breakdown?.docCharge || 0) +
        Number(line.breakdown?.codCharge || 0))
  ) || 0;

const lineRovCharge = (line) =>
  Number(line.rovChg ?? line.breakdown?.rovCharge ?? 0) || 0;

const lineOdaCharge = (line) =>
  Number(line.odaChg ?? line.breakdown?.odaCharge ?? 0) || 0;

const sumInvoiceTotals = (lines = []) =>
  lines.reduce(
    (acc, line) => {
      const freight = lineFreightAmount(line);
      const docket = lineDocketCharge(line);
      const rov = lineRovCharge(line);
      const oda = lineOdaCharge(line);
      acc.freightSubtotal += freight;
      acc.docketCharge += docket;
      acc.rovCharge += rov;
      acc.odaCharge += oda;
      acc.weightSlabRate += freight;
      acc.docCharge += Number(line.breakdown?.docCharge || 0);
      acc.codCharge += Number(line.breakdown?.codCharge || 0);
      acc.lineCount += 1;
      return acc;
    },
    {
      freightSubtotal: 0,
      docketCharge: 0,
      rovCharge: 0,
      odaCharge: 0,
      weightSlabRate: 0,
      codCharge: 0,
      docCharge: 0,
      lineCount: 0,
    }
  );

const recalculateInvoiceTotals = (invoice) => {
  const lines = invoice.lines || [];
  const sums = sumInvoiceTotals(lines);
  const freightSubtotal = round2(sums.freightSubtotal);
  const docketCharge = round2(sums.docketCharge);
  const rovCharge = round2(sums.rovCharge);
  const odaCharge = round2(sums.odaCharge);
  const chargesSubtotal = round2(docketCharge + rovCharge + odaCharge);
  const subtotalBeforeFuel = round2(freightSubtotal + chargesSubtotal);

  const fuelPercent = round2(
    invoice.profile?.fuelSurchargePercent ??
      invoice.totals?.fuelSurchargePercent ??
      0
  );

  let fuelSurcharge;
  if (invoice.totals?.fuelSurchargeManual) {
    fuelSurcharge = round2(invoice.totals.fuelSurcharge);
  } else {
    fuelSurcharge = round2((freightSubtotal * fuelPercent) / 100);
  }

  const meta = invoice.invoiceMeta || {};
  const cgstPercent = round2(meta.cgstPercent ?? 0);
  const sgstPercent = round2(meta.sgstPercent ?? 0);

  const taxableAmount = round2(subtotalBeforeFuel + fuelSurcharge);
  const cgstAmount = round2((taxableAmount * cgstPercent) / 100);
  const sgstAmount = round2((taxableAmount * sgstPercent) / 100);
  const billAmount = Math.round(taxableAmount + cgstAmount + sgstAmount);

  const totals = {
    freightSubtotal,
    docketCharge,
    rovCharge,
    odaCharge,
    chargesSubtotal,
    subtotalBeforeFuel,
    weightSlabRate: freightSubtotal,
    codCharge: round2(sums.codCharge),
    docCharge: round2(sums.docCharge),
    fuelSurchargePercent: fuelPercent,
    fuelSurcharge,
    cgstPercent,
    sgstPercent,
    cgstAmount,
    sgstAmount,
    taxableAmount,
    finalRate: billAmount,
    billAmount,
    amountInWords: amountInWords(billAmount),
    lineCount: sums.lineCount,
  };

  Object.keys(totals).forEach((key) => {
    if (typeof totals[key] === "number" && key !== "billAmount") {
      totals[key] = round2(totals[key]);
    }
  });

  return { ...invoice, totals };
};

module.exports = {
  round2,
  lineFreightAmount,
  lineDocketCharge,
  lineRovCharge,
  lineOdaCharge,
  sumInvoiceTotals,
  recalculateInvoiceTotals,
};

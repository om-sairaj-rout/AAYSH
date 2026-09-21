const PDFDocument = require("pdfkit");
const {
  DEFAULT_ISSUER,
  DEFAULT_BANK,
  DEFAULT_FOOTER_TERMS,
  DEFAULT_FOOTER_NOTE,
  DEFAULT_PREPARED_BY,
} = require("./billingInvoiceConstants");

const fontBold = "Helvetica-Bold";
const fontNormal = "Helvetica";

const formatDisplayDate = (isoDate) => {
  if (!isoDate) return "";
  const parts = String(isoDate).slice(0, 10).split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const { TABLE_HEADERS, lineToTableRow, formatMoney } = require("./billingInvoiceTable");
const { resolveStateCode } = require("./indianStateCodes");

const HEADER_ROW_HEIGHT = 16;
const BODY_ROW_HEIGHT = 14;

const TABLE_ALIGN = [
  "center",
  "left",
  "center",
  "left",
  "center",
  "center",
  "right",
  "right",
  "right",
  "right",
  "right",
];

const TABLE_WIDTHS = [26, 84, 40, 84, 34, 26, 38, 38, 36, 42, 91];

const TABLE_COLUMNS = TABLE_HEADERS.map((label, index) => ({
  key: String(index),
  label,
  width: TABLE_WIDTHS[index],
  align: TABLE_ALIGN[index],
}));

const tableWidth = TABLE_COLUMNS.reduce((sum, col) => sum + col.width, 0);

const drawTableHeader = (doc, x, y) => {
  doc.rect(x, y, tableWidth, HEADER_ROW_HEIGHT).strokeColor("#000000").lineWidth(0.5).stroke();

  let colX = x;
  TABLE_COLUMNS.forEach((col) => {
    doc
      .font(fontBold)
      .fontSize(6.5)
      .fillColor("#000000")
      .text(col.label, colX + 2, y + 4, {
        width: col.width - 4,
        align: col.align,
      });
    colX += col.width;
  });

  return y + HEADER_ROW_HEIGHT;
};

const drawTableRow = (doc, x, y, line, index) => {
  const rowValues = lineToTableRow(line, index).map((cell) => String(cell));

  let colX = x;
  TABLE_COLUMNS.forEach((col, colIndex) => {
    doc
      .font(fontNormal)
      .fontSize(6.5)
      .fillColor("#000000")
      .text(rowValues[colIndex] || "", colX + 2, y + 3, {
        width: col.width - 4,
        align: col.align,
        ellipsis: true,
      });
    colX += col.width;
  });

  return y + BODY_ROW_HEIGHT;
};

const strokeTableOutline = (doc, x, topY, bottomY) => {
  doc
    .rect(x, topY, tableWidth, bottomY - topY)
    .strokeColor("#000000")
    .lineWidth(0.5)
    .stroke();
};

const drawPageFooter = (doc, margin, printWidth, pageNo, pageCount) => {
  const y = doc.page.height - margin - 18;
  doc.font(fontNormal).fontSize(7).fillColor("#000000");
  doc.text(`Page ${pageNo} of ${pageCount}`, margin, y, { width: printWidth, align: "left" });
};

const drawStateFooterRow = (doc, boxX, footerRowY, boxW, pad, state, stateCode) => {
  const innerW = boxW - pad * 2;
  const textX = boxX + pad;
  doc
    .moveTo(boxX, footerRowY)
    .lineTo(boxX + boxW, footerRowY)
    .strokeColor("#000000")
    .lineWidth(0.75)
    .stroke();
  doc.font(fontBold).fontSize(7.5).fillColor("#000000");
  doc.text(`STATE: ${state}`, textX, footerRowY + 4, { width: innerW / 2, align: "left" });
  doc.text(`STATE Code: ${stateCode}`, textX, footerRowY + 4, { width: innerW, align: "right" });
};

const drawHeader = (doc, invoice, margin, printWidth) => {
  const meta = invoice.invoiceMeta || {};
  const company = invoice.company || {};
  const issuer = DEFAULT_ISSUER;

  let y = margin;

  doc.font(fontBold).fontSize(12).fillColor("#000000").text("-TAX INVOICE", margin, y, {
    width: printWidth,
    align: "center",
  });
  y += 20;

  const gap = 6;
  const boxW = (printWidth - gap) / 2;
  const pad = 6;
  const innerW = boxW - pad * 2;
  const stateRowH = 18;
  const boxTop = y;

  doc.font(fontNormal).fontSize(7.5);
  const emailLine = `E-mail: ${issuer.email}`;
  const emailH = doc.heightOfString(emailLine, { width: innerW });
  const leftBodyH = 11 + 9 + 9 + 9 + emailH + 10 + stateRowH;
  const rightBodyH = 72 + stateRowH;
  const boxH = Math.max(leftBodyH, rightBodyH, 108);

  const leftX = margin + pad;
  const rightBoxX = margin + boxW + gap;
  const rightX = rightBoxX + pad;

  doc.rect(margin, boxTop, boxW, boxH).strokeColor("#000000").lineWidth(0.75).stroke();
  doc.rect(rightBoxX, boxTop, boxW, boxH).strokeColor("#000000").lineWidth(0.75).stroke();

  let ly = boxTop + pad;
  doc.font(fontBold).fontSize(9).text(issuer.name, leftX, ly, { width: innerW });
  ly += 11;
  doc.font(fontNormal).fontSize(7.5);
  doc.text(issuer.addressLine1, leftX, ly, { width: innerW });
  ly += 9;
  doc.text(issuer.cityPin, leftX, ly, { width: innerW });
  ly += 9;
  doc.text(`TEL: ${issuer.phone}`, leftX, ly, { width: innerW });
  ly += 9;
  doc.text(emailLine, leftX, ly, { width: innerW });
  ly += emailH + 2;
  doc.font(fontBold).text(`GST No.: ${issuer.gstin}`, leftX, ly, { width: innerW });
  drawStateFooterRow(
    doc,
    margin,
    boxTop + boxH - stateRowH,
    boxW,
    pad,
    issuer.state,
    issuer.stateCode
  );

  let ry = boxTop + pad;
  const billName = company.companyName || "";
  doc.font(fontBold).fontSize(7.5);
  doc.text("Bill To.:", rightX, ry, { continued: true });
  doc.text(` ${billName}`, { width: innerW - 42 });
  ry += 11;
  doc.font(fontNormal).fontSize(7.5);
  if (company.address) {
    doc.text(company.address, rightX, ry, { width: innerW });
    ry += doc.heightOfString(company.address, { width: innerW }) + 2;
  }
  const billCityLine = [company.city, company.state, company.zip_code]
    .filter(Boolean)
    .join(" ");
  if (billCityLine) {
    doc.text(billCityLine, rightX, ry, { width: innerW });
    ry += 10;
  }

  const periodFrom = meta.billPeriodFrom || "";
  const periodTo = meta.billPeriodTo || "";
  const periodText =
    meta.billPeriod ||
    (periodFrom && periodTo ? `${periodFrom} To ${periodTo}` : periodFrom || periodTo || "");

  if (periodText) {
    doc.font(fontBold).fontSize(7.5).text(`Invoice Period: ${periodText}`, rightX, ry, {
      width: innerW,
    });
    ry += 11;
  }

  const billStateCode = resolveStateCode(company.state) || company.stateCode || "";
  const midDividerY = boxTop + boxH - stateRowH - 18;
  doc
    .moveTo(rightBoxX, midDividerY)
    .lineTo(rightBoxX + boxW, midDividerY)
    .stroke();

  doc.font(fontBold).fontSize(7).text(`Invoice No.: ${meta.invoiceNumber || ""}`, rightX, midDividerY + 4, {
    width: innerW / 2,
    align: "left",
  });
  doc.text(`Invoice Date: ${formatDisplayDate(meta.invoiceDate)}`, rightX, midDividerY + 4, {
    width: innerW,
    align: "right",
  });

  drawStateFooterRow(
    doc,
    rightBoxX,
    boxTop + boxH - stateRowH,
    boxW,
    pad,
    company.state || "",
    billStateCode
  );

  return boxTop + boxH + 8;
};

const measureFooterBlockHeight = (doc, printWidth) => {
  const pad = 8;
  const bank = DEFAULT_BANK;
  const note = DEFAULT_FOOTER_NOTE;
  const textW = printWidth - pad * 2 - 210;
  doc.font(fontNormal).fontSize(7);
  let h = pad + 66;
  h += 12;
  h += DEFAULT_FOOTER_TERMS.length * 10;
  h += doc.heightOfString(note, { width: textW }) + 14;
  h += 14;
  h += pad;
  return h;
};

const drawFooterBorderBlock = (doc, margin, printWidth, blockTop) => {
  const bank = DEFAULT_BANK;
  const issuer = DEFAULT_ISSUER;
  const note = DEFAULT_FOOTER_NOTE;
  const pad = 8;
  const blockH = measureFooterBlockHeight(doc, printWidth);
  const innerW = printWidth - pad * 2;
  const signBoxW = 220;
  const signBoxH = 64;
  const textX = margin + pad;
  const signX = margin + printWidth - pad - signBoxW;

  doc.rect(margin, blockTop, printWidth, blockH).strokeColor("#000000").lineWidth(0.75).stroke();

  let y = blockTop + pad;
  doc.font(fontBold).fontSize(7.5).fillColor("#000000");
  doc.text(`Bank Details: ${bank.bankName}`, textX, y, { width: innerW - signBoxW - 12 });
  y += 11;
  doc.font(fontNormal).fontSize(7);
  doc.text("A/C Name : ", textX, y, { continued: true });
  doc.font(fontBold).text(bank.accountName);
  y += 10;
  doc.font(fontNormal).text("A/C No : ", textX, y, { continued: true });
  doc.font(fontBold).text(bank.accountNo);
  y += 10;
  doc.font(fontNormal).text("IFSC : ", textX, y, { continued: true });
  doc.font(fontBold).text(bank.ifsc);

  const signY = blockTop + pad;
  doc.rect(signX, signY, signBoxW, signBoxH).stroke();
  doc.font(fontBold).fontSize(7.5).text(`For M/S ${issuer.name}`, signX + 6, signY + 8, {
    width: signBoxW - 12,
  });
  doc.font(fontNormal).fontSize(7).text("(Auth. Signatory)", signX, signY + signBoxH - 18, {
    width: signBoxW,
    align: "center",
  });

  y = blockTop + pad + signBoxH + 10;
  doc.font(fontNormal).fontSize(7).text("E.&O. E", textX, y);
  y += 11;

  DEFAULT_FOOTER_TERMS.forEach((term, index) => {
    if (index === 0) {
      doc.font(fontNormal).text(`${index + 1}. Please pay by Cheque/ Draft in favour of `, textX, y, {
        continued: true,
      });
      doc.font(fontBold).text(issuer.name);
      y += 10;
      return;
    }
    doc.font(fontNormal).text(`${index + 1}. ${term}`, textX, y, { width: innerW });
    y += 10;
  });

  y += 4;
  doc.font(fontBold).fontSize(7).text("Note: -", textX, y, { continued: true });
  doc.font(fontNormal).text(` ${note}`, { width: innerW - 40 });
  y = doc.y + 10;

  const preparedBy = DEFAULT_PREPARED_BY;
  doc.font(fontBold).fontSize(7).text("PREPARED BY: - ", textX, y, { continued: true });
  doc.font(fontNormal).text(preparedBy);

  return blockTop + blockH;
};

const drawSummaryFooter = (doc, invoice, margin, printWidth, startY) => {
  const totals = invoice.totals || {};
  const meta = invoice.invoiceMeta || {};

  let y = startY + 6;

  doc.font(fontBold).fontSize(7).fillColor("#000000");
  doc.text(`Count: ${totals.lineCount || invoice.lines?.length || 0}`, margin, y);
  y += 12;

  const summaryX = margin + printWidth - 220;
  const labelW = 120;
  const valueW = 90;

  const summaryRows = [
    ["Amount:", formatMoney(totals.freightSubtotal)],
    [
      `Fuel Surcharge@ ${Number(totals.fuelSurchargePercent || 0)} %`,
      formatMoney(totals.fuelSurcharge),
    ],
    ...(totals.cgstPercent
      ? [[`CGST@ ${Number(totals.cgstPercent)} %`, formatMoney(totals.cgstAmount)]]
      : []),
    ...(totals.sgstPercent
      ? [[`SGST@ ${Number(totals.sgstPercent)} %`, formatMoney(totals.sgstAmount)]]
      : []),
  ];

  summaryRows.forEach(([label, value]) => {
    doc.font(fontNormal).fontSize(7).text(label, summaryX, y, { width: labelW, align: "right" });
    doc.text(value, summaryX + labelW + 4, y, { width: valueW, align: "right" });
    y += 11;
  });

  y += 8;
  const words = totals.amountInWords || meta.amountInWords || "";
  const billAmount = formatMoney(Math.round(Number(totals.billAmount || 0)));
  const lineY = y;

  doc
    .moveTo(margin, lineY)
    .lineTo(margin + printWidth, lineY)
    .strokeColor("#000000")
    .lineWidth(0.5)
    .stroke();

  const textY = lineY + 5;
  doc.font(fontBold).fontSize(7).text("Amount in Words:", margin, textY, { continued: false });
  doc
    .font(fontNormal)
    .fontSize(7)
    .text(words, margin + 78, textY, { width: printWidth - 220, ellipsis: true });
  doc.font(fontBold).text("Bill Amount:", margin + printWidth - 118, textY, {
    width: 58,
    align: "left",
  });
  doc.font(fontNormal).text(billAmount, margin + printWidth - 58, textY, {
    width: 54,
    align: "right",
  });

  const lineY2 = textY + 12;
  doc
    .moveTo(margin, lineY2)
    .lineTo(margin + printWidth, lineY2)
    .strokeColor("#000000")
    .lineWidth(0.5)
    .stroke();
  y = lineY2 + 10;

  const footerBlockH = measureFooterBlockHeight(doc, printWidth);
  const pageBottom = doc.page.height - margin - 36;
  if (y + footerBlockH > pageBottom) {
    doc.addPage();
    y = margin + 8;
  }

  return drawFooterBorderBlock(doc, margin, printWidth, y);
};

const buildPdfBuffer = (invoice) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 28, autoFirstPage: true });
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const margin = 28;
      const printWidth = doc.page.width - margin * 2;
      const lines = invoice.lines || [];

      const rowsPerPageFirst = 32;
      const rowsPerPageNext = 36;
      const pagePlan = [];
      if (!lines.length) {
        pagePlan.push({ start: 0, end: 0 });
      } else {
        let index = 0;
        let first = true;
        while (index < lines.length) {
          const take = first ? rowsPerPageFirst : rowsPerPageNext;
          pagePlan.push({ start: index, end: Math.min(index + take, lines.length) });
          index += take;
          first = false;
        }
      }

      pagePlan.forEach((page, pageIndex) => {
        if (pageIndex > 0) doc.addPage();

        let y = drawHeader(doc, invoice, margin, printWidth);
        let tableTop = y;
        y = drawTableHeader(doc, margin, y);

        for (let i = page.start; i < page.end; i += 1) {
          if (y > doc.page.height - margin - 50) {
            strokeTableOutline(doc, margin, tableTop, y);
            drawPageFooter(doc, margin, printWidth, pageIndex + 1, pagePlan.length);
            doc.addPage();
            y = drawHeader(doc, invoice, margin, printWidth);
            tableTop = y;
            y = drawTableHeader(doc, margin, y);
          }
          y = drawTableRow(doc, margin, y, lines[i], i);
        }

        strokeTableOutline(doc, margin, tableTop, y);

        const isLastPage = pageIndex === pagePlan.length - 1;
        if (isLastPage && lines.length) {
          const closingMinH = 200;
          if (y > doc.page.height - margin - closingMinH) {
            drawPageFooter(doc, margin, printWidth, pageIndex + 1, pagePlan.length);
            doc.addPage();
            y = drawHeader(doc, invoice, margin, printWidth);
          }
          drawSummaryFooter(doc, invoice, margin, printWidth, y);
        }

        drawPageFooter(doc, margin, printWidth, pageIndex + 1, pagePlan.length);
      });

      if (!lines.length) {
        drawSummaryFooter(doc, invoice, margin, printWidth, drawHeader(doc, invoice, margin, printWidth));
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });

module.exports = { buildPdfBuffer };

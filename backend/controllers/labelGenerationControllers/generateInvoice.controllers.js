const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const User = require("../../models/user.model");

const generateInvoice = async (req, res) => {
    try {
        const { orderIds } = req.body;

        if (!orderIds || orderIds.length === 0) {
            return res.status(400).json({ success: false, message: "No order IDs provided" });
        }

        // Fetch order details
        const orders = await Order.find({ _id: { $in: orderIds } }).lean();

        if (!orders || orders.length === 0) {
            return res.status(404).json({ success: false, message: "Orders not found" });
        }

        // Fetch shipping details
        const shippings = await Shipping.find({ orderId: { $in: orderIds } }).lean();
        const shippingMap = new Map(shippings.map(s => [s.orderId.toString(), s]));

        // Fetch seller details (if seller is linked via uploadedBy)
        const seller = await User.findById(orders[0].uploadedBy).lean();

        orders.forEach(order => {
            order.shipping = shippingMap.get(order._id.toString()) || null;
        });

        const doc = new PDFDocument({ margin: 20, size: "A4", autoFirstPage: true });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=tax_invoice.pdf");

        doc.pipe(res);

        const fontBold = "Helvetica-Bold";
        const fontNormal = "Helvetica";

        const margin = 20;
        const printWidth = doc.page.width - (margin * 2); // ~555 pt

        // Dynamic Seller Info fallback
        const sellerName = seller?.username || "N/A";
        const sellerAddress = seller?.address 
            ? `${seller.address}, ${seller.city || ''}, ${seller.state || ''} - ${seller.zip_code || ''}`
            : "N/A";
        const sellerPhone = seller?.mobile_number || "N/A";
        const sellerGstin = seller?.gstin || "N/A";
        const sellerWebsite = seller?.website || "N/A";
        const sellerEmail = seller?.email || "N/A";

        for (let i = 0; i < orders.length; i++) {
            const order = orders[i];

            if (i > 0) doc.addPage();

            let y = margin;

            // ================= 1. BRAND LOGO & HEADER =================
            const logoPath = path.join(__dirname, "../../assets/fiberise_logo.jpg");
            const logoWidth = 240; // Big logo
            const logoX = margin + (printWidth - logoWidth) / 2; // Centered

            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, logoX, y, { width: logoWidth });
                y += 65; // Adjust vertical space for big logo
            } else {
                doc.font(fontBold).fontSize(22).fillColor("#000000").text(sellerName, margin, y, {
                    align: "center",
                    width: printWidth
                });
                y += 35;
            }

            // "TAX INVOICE" Title Center Strip (Bigger, but smaller than logo)
            doc.font(fontBold).fontSize(20).fillColor("#000000").text("TAX INVOICE", margin, y, {
                align: "center",
                width: printWidth
            });

            y += 25;

            // ================= 2. THREE-COLUMN ADDRESS & INVOICE METADATA BOX =================
            const colW = printWidth / 3;

            // --- Calculate Dynamic Height for Column 2 Address ---
            doc.font(fontNormal).fontSize(7.5);
            const addressTextHeight = doc.heightOfString(sellerAddress, { width: colW - 12 });
            
            // Total height needed for column 2 details
            const col2ContentHeight = 6 + 12 + 12 + addressTextHeight + 4 + 10 + 10 + 10 + 10 + 6;
            const gridHeight = Math.max(160, col2ContentHeight);

            // Draw outer grid box
            doc.rect(margin, y, printWidth, gridHeight).strokeColor("#000000").lineWidth(0.75).stroke();

            // Column Grid Vertical Dividers
            doc.moveTo(margin + colW, y).lineTo(margin + colW, y + gridHeight).stroke();
            doc.moveTo(margin + (colW * 2), y).lineTo(margin + (colW * 2), y + gridHeight).stroke();

            // --- Column 1: SHIPPING ADDRESS ---
            let col1Y = y + 6;
            doc.font(fontBold).fontSize(8).fillColor("#000000").text("SHIPPING ADDRESS:", margin + 6, col1Y);
            col1Y += 12;

            const consigneeName = `${order.consigneeName || ''} ${order.consigneeLastName || ''}`.trim() || "Durga Bhingarde";
            doc.font(fontNormal).fontSize(8).text(consigneeName, margin + 6, col1Y);
            col1Y += 11;

            const shipAddress = order.address 
                ? `${order.address}, ${order.address2 || ''}\n${order.destinationCity || ''} ${order.destinationPincode || ''}\n${order.destinationState || ''}\nIndia`
                : "A501 Near Himmat Bahaddur\nParisar\nA501, near Himmat Bahaddur\nParisar\nKolhapur 416003\nMaharashtra\nIndia";

            doc.text(shipAddress, margin + 6, col1Y, { width: colW - 12 });

            // --- Column 2: SOLD BY (Dynamic height calculation) ---
            let col2Y = y + 6;
            const col2X = margin + colW + 6;
            doc.font(fontBold).fontSize(8).text("SOLD BY:", col2X, col2Y);
            col2Y += 12;

            doc.font(fontBold).fontSize(8).text(sellerName, col2X, col2Y, { width: colW - 12 });
            col2Y += 12;

            doc.font(fontNormal).fontSize(7.5).text(sellerAddress, col2X, col2Y, { width: colW - 12 });
            col2Y += addressTextHeight + 4; // Places remaining details strictly below address

            doc.text(`Ph: ${sellerPhone}`, col2X, col2Y);
            col2Y += 10;
            doc.text(`GSTIN No. ${sellerGstin}`, col2X, col2Y);
            col2Y += 10;
            doc.text(`Website: ${sellerWebsite}`, col2X, col2Y, { width: colW - 12, ellipsis: true });
            col2Y += 10;
            doc.text(`Email: ${sellerEmail}`, col2X, col2Y, { width: colW - 12, ellipsis: true });

            // --- Column 3: INVOICE DETAILS ---
            let col3Y = y + 6;
            const col3X = margin + (colW * 2) + 6;
            doc.font(fontBold).fontSize(8).text("INVOICE DETAILS:", col3X, col3Y);
            col3Y += 14;

            const nowFormatted = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
            const invoiceNo = order.invoiceNo || "N/A";
            const orderNo = order.externalOrderId || "N/A";
            const orderDate = order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-GB') : "N/A";
            const courier = order.shipping?.courierName || "N/A";
            const awbNo = order.shipping?.awbNumber || "N/A";
            const paymentMethod = (order.paymentMethod || "N/A").toLowerCase();

            const metaList = [
                { label: "INVOICE NO.", val: `: ${invoiceNo}` },
                { label: "INVOICE DATE", val: `: ${nowFormatted}` },
                { label: "ORDER NO.", val: `: ${orderNo}` },
                { label: "ORDER DATE", val: `: ${orderDate}` },
                { label: "SHIPPED BY", val: `: ${courier}` },
                { label: "AWB NO.", val: `: ${awbNo}` },
                { label: "PAYMENT METHOD", val: `: ${paymentMethod}` }
            ];

            metaList.forEach(meta => {
                doc.font(fontBold).fontSize(7).text(meta.label, col3X, col3Y, { width: 75 });
                doc.font(fontNormal).fontSize(7).text(meta.val, col3X + 68, col3Y, { width: colW - 78, ellipsis: true });
                col3Y += 12;
            });

            y += gridHeight;

            // ================= 3. ITEMIZED PRODUCTS TABLE =================
            const tableHeaderHeight = 22;
            doc.rect(margin, y, printWidth, tableHeaderHeight).strokeColor("#000000").lineWidth(0.5).stroke();

            // Table Column Widths
            const c1 = 30;  // S.NO.
            const c2 = 150; // PRODUCT NAME
            const c3 = 40;  // HSN
            const c4 = 30;  // QTY
            const c5 = 60;  // UNIT PRICE
            const c6 = 65;  // UNIT DISCOUNT
            const c7 = 55;  // TAXABLE VALUE
            const c8 = 60;  // IGST (Value %)
            const c9 = printWidth - (c1 + c2 + c3 + c4 + c5 + c6 + c7 + c8); // TOTAL (~65pt)

            doc.font(fontBold).fontSize(7.5).fillColor("#000000");
            doc.text("S.NO.", margin + 4, y + 6);
            doc.text("PRODUCT NAME", margin + c1 + 4, y + 6);
            doc.text("HSN", margin + c1 + c2 + 4, y + 6);
            doc.text("QTY", margin + c1 + c2 + c3 + 4, y + 6, { width: c4 - 8, align: "center" });
            doc.text("UNIT PRICE", margin + c1 + c2 + c3 + c4 + 4, y + 6, { width: c5 - 8, align: "right" });
            doc.text("UNIT DISCOUNT", margin + c1 + c2 + c3 + c4 + c5 + 4, y + 6, { width: c6 - 8, align: "right" });
            doc.text("TAXABLE VALUE", margin + c1 + c2 + c3 + c4 + c5 + c6 + 4, y + 3, { width: c7 - 8, align: "right" });
            doc.text("IGST (Value %)", margin + c1 + c2 + c3 + c4 + c5 + c6 + c7 + 4, y + 3, { width: c8 - 8, align: "right" });
            doc.text("TOTAL (Including GST)", margin + c1 + c2 + c3 + c4 + c5 + c6 + c7 + c8 + 4, y + 3, { width: c9 - 8, align: "right" });

            y += tableHeaderHeight;

            const itemsList = order.orderItems || [];

            if (!itemsList.length) {
                continue;
            }

            const itemRowHeight = 40;

            itemsList.forEach((item, index) => {
                doc.rect(margin, y, printWidth, itemRowHeight).stroke();

                const qty = Number(item.units || 1);
                const unitPrice = Number(item.sellingPrice || 0);
                const discount = Number(item.discount || 0);
                const tax = Number(item.tax || 0);

                const taxable = (unitPrice * qty) - discount;
                const gstAmount = taxable * (tax / 100);

                const igstText = tax > 0
                    ? `${gstAmount.toFixed(2)} (${tax}%)`
                    : "";

                const total = taxable + gstAmount;

                doc.font(fontNormal).fontSize(8).fillColor("#000000");
                doc.text(`${index + 1}`, margin + 4, y + 8);

                // Product Name + SKU Line
                doc.font(fontBold).fontSize(8).text(item.name || "", margin + c1 + 4, y + 8, { width: c2 - 8, ellipsis: true });
                doc.font(fontNormal).fontSize(7.5).text(`SKU: ${item.sku || ''}`, margin + c1 + 4, y + 20, { width: c2 - 8, ellipsis: true });

                doc.text(item.hsn || "", margin + c1 + c2 + 4, y + 8);
                doc.text(`${qty}`, margin + c1 + c2 + c3 + 4, y + 8, { width: c4 - 8, align: "center" });
                doc.text(`Rs. ${Number(unitPrice).toFixed(2)}`, margin + c1 + c2 + c3 + c4 + 4, y + 8, { width: c5 - 8, align: "right" });
                doc.text(`${Number(discount).toFixed(2)}`, margin + c1 + c2 + c3 + c4 + c5 + 4, y + 8, { width: c6 - 8, align: "right" });
                doc.text(`${Number(taxable).toFixed(2)}`, margin + c1 + c2 + c3 + c4 + c5 + c6 + 4, y + 8, { width: c7 - 8, align: "right" });
                doc.text(igstText, margin + c1 + c2 + c3 + c4 + c5 + c6 + c7 + 4, y + 8, { width: c8 - 8, align: "right" });
                doc.text(`${Number(total).toFixed(2)}`, margin + c1 + c2 + c3 + c4 + c5 + c6 + c7 + c8 + 4, y + 8, { width: c9 - 8, align: "right" });

                y += itemRowHeight;
            });

            // ================= 4. ORDER SUMMARY =================
            let itemsTotal = 0;

            itemsList.forEach(item => {
                const qty = Number(item.units || 1);
                const unitPrice = Number(item.sellingPrice || 0);
                const discount = Number(item.discount || 0);
                const tax = Number(item.tax || 0);

                const taxable = (unitPrice * qty) - discount;
                const gst = taxable * (tax / 100);

                itemsTotal += taxable + gst;
            });

            const shippingCharges = Number(order.shippingCharges || 0);
            const giftwrapCharges = Number(order.giftwrapCharges || 0);
            const transactionCharges = Number(order.transactionCharges || 0);

            const grandTotal = Number(order.invoiceValue || itemsTotal);

            const summaryRows = [
                { label: "Items Total", value: itemsTotal }
            ];

            if (shippingCharges > 0) {
                summaryRows.push({ label: "Shipping Charges", value: shippingCharges });
            }

            if (giftwrapCharges > 0) {
                summaryRows.push({ label: "Gift Wrap Charges", value: giftwrapCharges });
            }

            if (transactionCharges > 0) {
                summaryRows.push({ label: "Transaction Charges", value: transactionCharges });
            }

            summaryRows.push({ label: "Grand Total", value: grandTotal });

            const boxWidth = 220;
            const boxX = margin + printWidth - boxWidth;
            const rowHeight = 18;
            const boxHeight = (summaryRows.length * rowHeight) + 10;

            doc.rect(boxX, y, boxWidth, boxHeight).stroke();

            let currentY = y + 6;

            summaryRows.forEach((row) => {
                if (row.label === "Grand Total") {
                    doc.moveTo(boxX, currentY - 3)
                        .lineTo(boxX + boxWidth, currentY - 3)
                        .stroke();

                    doc.font(fontBold);
                } else {
                    doc.font(fontNormal);
                }

                doc.fontSize(8);
                doc.text(row.label, boxX + 8, currentY);

                doc.text(
                    `Rs. ${row.value.toFixed(2)}`,
                    boxX,
                    currentY,
                    {
                        width: boxWidth - 8,
                        align: "right"
                    }
                );

                currentY += rowHeight;
            });

            y += boxHeight + 20;

            // ================= 5. AUTHORIZED SIGNATURE (LEFT) & REVERSE CHARGE (RIGHT) =================
            const sigBoxWidth = 140;
            const sigBoxHeight = 45;

            // Left Side: 1. Signature Box Drawn Above
            doc.rect(margin, y, sigBoxWidth, sigBoxHeight).strokeColor("#000000").lineWidth(0.5).stroke();

            // Left Side: 2. Authorized Signature Text Placed Below the Box
            const textY = y + sigBoxHeight + 6;
            doc.font(fontNormal).fontSize(8).fillColor("#000000").text("Authorized Signature for", margin, textY);
            doc.font(fontBold).fontSize(8).text(sellerName, margin, textY + 11);

            // Right Side: Reverse Charge Statement
            const rightTextX = margin + printWidth - 250;
            doc.font(fontNormal).fontSize(8).fillColor("#000000").text(
                "Whether tax is payable under reverse charge - No",
                rightTextX,
                textY + 11,
                { width: 250, align: "right" }
            );
        }

        doc.end();

    } catch (err) {
        console.error("Invoice Generation Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: "Invoice generation failed" });
        }
    }
};

module.exports = generateInvoice;
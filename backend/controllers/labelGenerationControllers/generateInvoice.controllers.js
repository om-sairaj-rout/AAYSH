const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const Order = require("../../models/upload/order.model"); 
const Shipping = require("../../models/upload/shipping.model");

const generateInvoice = async (req, res) => {
    try {
        const { orderIds } = req.body;

        if (!orderIds || orderIds.length === 0) {
            return res.status(400).json({ success: false, message: "No order IDs provided" });
        }

        // Fetch order details
        const orders = await Order.find({ _id: { $in: orderIds } }).lean();

        // Fetch associated shipping records
        const shippings = await Shipping.find({
            orderId: { $in: orderIds }
        }).lean();

        const shippingMap = new Map(
            shippings.map(s => [s.orderId.toString(), s])
        );

        orders.forEach(order => {
            order.shipping = shippingMap.get(order._id.toString()) || null;
        });

        if (!orders || orders.length === 0) {
            return res.status(404).json({ success: false, message: "Orders not found" });
        }

        // Standard A4 dimensions in PDF points (595.28 x 841.89 pt)
        const doc = new PDFDocument({
            margin: 30,
            size: "A6" // Change to "A4" for full-page standard invoices if preferred
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=invoices.pdf");

        doc.pipe(res);

        const fontBold = "Helvetica-Bold";
        const fontNormal = "Helvetica";

        const margin = 30;
        const printWidth = doc.page.width - (margin * 2);

        for (let i = 0; i < orders.length; i++) {
            const order = orders[i];

            if (i > 0) doc.addPage();

            let y = margin;

            // Outer Perimeter Border
            doc.lineWidth(1)
               .strokeColor("#E2E8F0")
               .rect(margin, margin, printWidth, doc.page.height - (margin * 2))
               .stroke();

            // ================= 1. INVOICE HEADER & LOGO =================
            const headerHeight = 65;
            doc.lineWidth(0.5).strokeColor("#CBD5E1").rect(margin, y, printWidth, headerHeight).stroke();

            // Logo Placeholder
            const logoPath = path.join(__dirname, "../../assets/aaysh_logo_2.png");
            const logoWidth = 120;
            const logoHeight = 45;

            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, margin + 10, y + 10, {
                    fit: [logoWidth, logoHeight],
                    align: "left",
                    valign: "center"
                });
            } else {
                doc.font(fontBold).fontSize(16).fillColor("#0F172A").text("AAYSH", margin + 10, y + 15, { continued: true });
                doc.fillColor("#0D9488").text("EXPRESS");
                doc.font(fontNormal).fontSize(8).fillColor("#64748B").text("COMMERCIAL TAX INVOICE", margin + 10, y + 36);
            }

            // Right Header Block: Invoice & Order Meta
            const rightHeaderX = margin + printWidth - 180;
            doc.font(fontBold).fontSize(14).fillColor("#0F172A").text("TAX INVOICE", rightHeaderX, y + 12, { align: "right", width: 170 });
            
            doc.font(fontNormal).fontSize(8.5).fillColor("#475569");
            doc.text(`Invoice No: ${order.invoiceNo || "N/A"}`, rightHeaderX, y + 30, { align: "right", width: 170 });
            doc.text(`Order ID: ${order.externalOrderId || order._id.toString().slice(-8)}`, rightHeaderX, y + 42, { align: "right", width: 170 });

            y += headerHeight + 10;

            // ================= 2. BILLING & SHIPPING DETAILS GRID =================
            const addressBlockHeight = 85;
            const halfWidth = printWidth / 2;

            doc.rect(margin, y, printWidth, addressBlockHeight).stroke();
            doc.moveTo(margin + halfWidth, y).lineTo(margin + halfWidth, y + addressBlockHeight).stroke();

            // Left Box: Consignor / Shipped From
            doc.font(fontBold).fontSize(8).fillColor("#0D9488").text("BILLED / SHIPPED FROM:", margin + 8, y + 8);
            doc.font(fontBold).fontSize(9.5).fillColor("#0F172A").text((order.consignorName || "ABC MANUFACTURING LTD.").toUpperCase(), margin + 8, y + 20, { width: halfWidth - 16, ellipsis: true });
            
            const originLoc = order.pickupLocation ? `Hub: ${order.pickupLocation}` : "DEFAULT WAREHOUSE HUB, NOIDA, UP - 201301";
            doc.font(fontNormal).fontSize(8).fillColor("#475569").text(originLoc, margin + 8, y + 34, { width: halfWidth - 16, height: 30, ellipsis: true });
            doc.text(`GSTIN/PAN: Unregistered Vendor`, margin + 8, y + 68);

            // Right Box: Consignee / Billed To
            const rightBoxX = margin + halfWidth + 8;
            doc.font(fontBold).fontSize(8).fillColor("#0D9488").text("BILLED / SHIPPED TO:", rightBoxX, y + 8);
            
            const consigneeName = `${order.consigneeName || ''} ${order.consigneeLastName || ''}`.trim().toUpperCase() || "CUSTOMER";
            doc.font(fontBold).fontSize(9.5).fillColor("#0F172A").text(consigneeName, rightBoxX, y + 20, { width: halfWidth - 16, ellipsis: true });

            let fullAddress = (order.address || "").toUpperCase();
            if (order.address2) fullAddress += `, ${(order.address2).toUpperCase()}`;
            fullAddress += `, ${(order.destinationCity || '').toUpperCase()}, ${(order.destinationState || '').toUpperCase()} - ${order.destinationPincode || ''}`;

            doc.font(fontNormal).fontSize(8).fillColor("#475569").text(fullAddress, rightBoxX, y + 34, { width: halfWidth - 16, height: 32, ellipsis: true });
            
            const contactStr = order.billingPhone || order.contactNo || "N/A";
            doc.text(`Phone: ${contactStr}`, rightBoxX, y + 68);

            y += addressBlockHeight + 10;

            // ================= 3. SHIPPING & ORDER METADATA BAR =================
            const metaBarHeight = 28;
            doc.rect(margin, y, printWidth, metaBarHeight).stroke();

            const metaColWidth = printWidth / 4;
            for (let c = 1; c < 4; c++) {
                doc.moveTo(margin + (metaColWidth * c), y).lineTo(margin + (metaColWidth * c), y + metaBarHeight).stroke();
            }

            // Date
            const formattedDate = order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-GB') : "N/A";
            doc.font(fontBold).fontSize(6.5).fillColor("#64748B").text("DATE", margin + 5, y + 4);
            doc.font(fontNormal).fontSize(8).fillColor("#0F172A").text(formattedDate, margin + 5, y + 14);

            // Payment Mode
            const payMethod = (order.paymentMethod || "COD").toUpperCase();
            doc.font(fontBold).fontSize(6.5).fillColor("#64748B").text("PAYMENT MODE", margin + metaColWidth + 5, y + 4);
            doc.font(fontBold).fontSize(8).fillColor("#0F172A").text(payMethod, margin + metaColWidth + 5, y + 14);

            // Courier
            const courierName = (order.shipping?.courierName || "SURFACE").toUpperCase();
            doc.font(fontBold).fontSize(6.5).fillColor("#64748B").text("COURIER PARTNER", margin + (metaColWidth * 2) + 5, y + 4);
            doc.font(fontNormal).fontSize(8).fillColor("#0F172A").text(courierName, margin + (metaColWidth * 2) + 5, y + 14, { width: metaColWidth - 10, ellipsis: true });

            // AWB No
            const awbNo = order.shipping?.awbNumber || "UNASSIGNED";
            doc.font(fontBold).fontSize(6.5).fillColor("#64748B").text("AWB NUMBER", margin + (metaColWidth * 3) + 5, y + 4);
            doc.font(fontNormal).fontSize(8).fillColor("#0F172A").text(awbNo, margin + (metaColWidth * 3) + 5, y + 14, { width: metaColWidth - 10, ellipsis: true });

            y += metaBarHeight + 10;

            // ================= 4. ITEMIZED PRODUCTS TABLE =================
            const tableHeaderHeight = 20;
            doc.fillColor("#F8FAFC").rect(margin, y, printWidth, tableHeaderHeight).fill().stroke();

            // Column Width Definitions
            const col1 = 20;  // #
            const col2 = 120; // Description
            const col3 = 45;  // Rate
            const col4 = 30;  // Qty
            const col5 = 40;  // Discount
            const col6 = printWidth - (col1 + col2 + col3 + col4 + col5); // Subtotal (~73pt)

            doc.font(fontBold).fontSize(7.5).fillColor("#334155");
            doc.text("#", margin + 4, y + 6);
            doc.text("ITEM DESCRIPTION", margin + col1 + 4, y + 6);
            doc.text("RATE", margin + col1 + col2 + 4, y + 6, { width: col3 - 8, align: "right" });
            doc.text("QTY", margin + col1 + col2 + col3 + 4, y + 6, { width: col4 - 8, align: "center" });
            doc.text("DISC.", margin + col1 + col2 + col3 + col4 + 4, y + 6, { width: col5 - 8, align: "right" });
            doc.text("TOTAL", margin + col1 + col2 + col3 + col4 + col5 + 4, y + 6, { width: col6 - 8, align: "right" });

            y += tableHeaderHeight;

            let itemsList = order.orderItems && order.orderItems.length > 0 ? order.orderItems : [
                { name: "General Parcel Goods", units: order.qty || 1, sellingPrice: order.subTotal || order.invoiceValue || 0, discount: 0 }
            ];

            const itemRowHeight = 22;
            doc.font(fontNormal).fontSize(8).fillColor("#000000");

            itemsList.forEach((item, index) => {
                doc.rect(margin, y, printWidth, itemRowHeight).stroke();

                const rate = item.sellingPrice || 0;
                const units = item.units || 1;
                const disc = item.discount || 0;
                const total = (rate * units) - disc;

                doc.text(`${index + 1}`, margin + 4, y + 6);
                doc.text(item.name || "Item", margin + col1 + 4, y + 6, { width: col2 - 8, ellipsis: true });
                doc.text(`₹${rate}`, margin + col1 + col2 + 4, y + 6, { width: col3 - 8, align: "right" });
                doc.text(`${units}`, margin + col1 + col2 + col3 + 4, y + 6, { width: col4 - 8, align: "center" });
                doc.text(`₹${disc}`, margin + col1 + col2 + col3 + col4 + 4, y + 6, { width: col5 - 8, align: "right" });
                doc.text(`₹${total.toFixed(2)}`, margin + col1 + col2 + col3 + col4 + col5 + 4, y + 6, { width: col6 - 8, align: "right" });

                y += itemRowHeight;
            });

            // ================= 5. FINANCIAL SUMMARY TOTALS =================
            y += 5;
            const summaryBoxWidth = 160;
            const summaryX = margin + printWidth - summaryBoxWidth;

            const summaryRows = [
                { label: "Sub Total:", val: `₹${(order.subTotal || order.invoiceValue || 0).toFixed(2)}` },
                { label: "Shipping Charges:", val: `₹${(order.shippingCharges || 0).toFixed(2)}` },
                { label: "Discount:", val: `- ₹${(order.totalDiscount || 0).toFixed(2)}` },
                { label: "Grand Total:", val: `₹${(order.invoiceValue || 0).toFixed(2)}`, bold: true }
            ];

            summaryRows.forEach(row => {
                doc.font(row.bold ? fontBold : fontNormal).fontSize(row.bold ? 9.5 : 8).fillColor(row.bold ? "#0F172A" : "#475569");
                doc.text(row.label, summaryX, y, { width: 85, align: "right" });
                doc.text(row.val, summaryX + 90, y, { width: 70, align: "right" });
                y += 14;
            });

            // ================= 6. AUTHORIZED SIGNATURE & FOOTER =================
            const bottomY = doc.page.height - margin - 35;
            doc.lineWidth(0.5).strokeColor("#CBD5E1").moveTo(margin, bottomY).lineTo(margin + printWidth, bottomY).stroke();

            doc.font(fontNormal).fontSize(7).fillColor("#64748B").text(
                "This is a computer-generated tax invoice and requires no physical signature under Indian Information Technology Act.",
                margin + 5,
                bottomY + 8,
                { width: printWidth - 10, align: "center" }
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
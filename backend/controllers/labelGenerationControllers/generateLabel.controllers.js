const PDFDocument = require("pdfkit");
const bwipjs = require("bwip-js");
const path = require("path");
const fs = require("fs");
const Order = require("../../models/upload/order.model"); 
const Shipping = require("../../models/upload/shipping.model");

const generateLabel = async (req, res) => {
    try {
        const { orderIds } = req.body;

        if (!orderIds || orderIds.length === 0) {
            return res.status(400).json({ success: false, message: "No order IDs provided" });
        }

        // Fetch orders and populate reference details
        const orders = await Order.find({ _id: { $in: orderIds } }).lean();

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

        // 4 x 6 inches in PDF Points (1 inch = 72 points) -> 288 x 432 points
        const LABEL_WIDTH = 288;
        const LABEL_HEIGHT = 432;

        const doc = new PDFDocument({
            margin: 0,
            size: [LABEL_WIDTH, LABEL_HEIGHT]
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=labels_4x6.pdf");

        doc.pipe(res);

        const fontBold = "Helvetica-Bold";
        const fontNormal = "Helvetica";
        const fontMono = "Courier-Bold";

        const margin = 10;
        const printWidth = LABEL_WIDTH - (margin * 2); // 268 pt

        for (let i = 0; i < orders.length; i++) {
            const order = orders[i];

            if (i > 0) doc.addPage();

            // Outer Perimeter Boundary Line
            doc.lineWidth(1)
               .strokeColor("#000000")
               .rect(margin, margin, printWidth, LABEL_HEIGHT - (margin * 2))
               .stroke();

            let y = margin;

            // ================= 1. BRANDING & LOGO HEADER BOX (ENLARGED LOGO) =================
            const headerHeight = 52; // Increased header height to fit larger logo safely
            doc.rect(margin, y, printWidth, headerHeight).stroke();

            // LOGO ZONE (Left Header)
            const logoPath = path.join(__dirname, "../../assets/aaysh_logo_2.png"); 
            const logoWidth = 115; // Increased logo width
            const logoHeight = 42; // Increased logo height

            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, margin + 5, y + 5, {
                    fit: [logoWidth, logoHeight],
                    align: "left",
                    valign: "center"
                });
            } else {
                // Fallback structured text branding
                doc.font(fontBold).fontSize(14).fillColor("#1E293B").text("AAYSH", margin + 6, y + 10, { continued: true });
                doc.fillColor("#0D9488").text("EXPRESS");
                doc.font(fontNormal).fontSize(6.5).fillColor("#64748B").text("LOGISTICS & FULFILLMENT", margin + 6, y + 28);
            }

            // ORDER DATE ZONE (Right Header Box - Formerly COD location)
            const rightHeaderX = margin + printWidth - 95;
            doc.moveTo(rightHeaderX, y).lineTo(rightHeaderX, y + headerHeight).stroke();

            doc.font(fontBold).fontSize(6.5).fillColor("#475569").text("ORDER DATE", rightHeaderX + 5, y + 8, {
                width: 85,
                align: "center"
            });

            const formattedOrderDate = order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-GB') : "N/A";
            doc.font(fontBold).fontSize(9.5).fillColor("#000000").text(formattedOrderDate, rightHeaderX + 5, y + 22, {
                width: 85,
                align: "center"
            });

            y += headerHeight;

            // ================= 2. MAIN AWB BARCODE SECTION =================
            const barcodeBoxHeight = 70;
            doc.rect(margin, y, printWidth, barcodeBoxHeight).stroke();

            const awbNo = order.shipping?.awbNumber;

            try {
                // Barcode generated directly from AWB Number
                const barcodeBuffer = await bwipjs.toBuffer({
                    bcid: "code128",
                    text: awbNo,
                    scale: 3,
                    height: 12,
                    includetext: false
                });

                const bcRenderWidth = 210;
                const bcX = margin + (printWidth / 2) - (bcRenderWidth / 2);

                doc.image(barcodeBuffer, bcX, y + 8, { width: bcRenderWidth, height: 38 });

                // Text AWB Readout
                doc.font(fontMono).fontSize(12).text(awbNo, margin, y + 50, {
                    align: "center",
                    width: printWidth
                });

            } catch (bcErr) {
                console.error("Barcode Generation Error:", bcErr);
                doc.font(fontBold).fontSize(10).text(`AWB: ${awbNo}`, margin, y + 25, {
                    align: "center",
                    width: printWidth
                });
            }

            y += barcodeBoxHeight;

            // ================= 3. CONSIGNEE / SHIP TO ADDRESS =================
            const consigneeHeight = 100;
            doc.rect(margin, y, printWidth, consigneeHeight).stroke();

            doc.font(fontBold).fontSize(7).fillColor("#475569").text("SHIP TO (CONSIGNEE):", margin + 6, y + 5);

            // Consignee Full Name
            const fullName = `${order.consigneeName || ''} ${order.consigneeLastName || ''}`.trim().toUpperCase() || "CUSTOMER";
            doc.font(fontBold).fontSize(11).fillColor("#000000").text(fullName, margin + 6, y + 16, {
                width: printWidth - 12,
                ellipsis: true
            });

            // Street Addresses (Line 1 & Line 2)
            doc.font(fontNormal).fontSize(8.5);
            let fullAddress = (order.address || "").toUpperCase();
            if (order.address2) {
                fullAddress += `, ${(order.address2).toUpperCase()}`;
            }

            doc.text(fullAddress, margin + 6, y + 30, {
                width: printWidth - 12,
                height: 30,
                ellipsis: true
            });

            // City, State, Pincode
            const destinationLine = `${(order.destinationCity || '').toUpperCase()}, ${(order.destinationState || '').toUpperCase()} - ${order.destinationPincode || ''}`;
            doc.font(fontBold).fontSize(9.5).text(destinationLine, margin + 6, y + 64, {
                width: printWidth - 12,
                ellipsis: true
            });

            // Contact Info
            const phoneStr = order.billingPhone || order.contactNo || "N/A";
            doc.font(fontNormal).fontSize(8.5).text(`TEL: ${phoneStr}`, margin + 6, y + 82);

            y += consigneeHeight;

            // ================= 4. SHIPPER / CONSIGNOR DETAILS =================
            const shipperHeight = 40;
            doc.rect(margin, y, printWidth, shipperHeight).stroke();

            doc.font(fontBold).fontSize(7).fillColor("#475569").text("RETURN ADDRESS (CONSIGNOR):", margin + 6, y + 4);
            doc.font(fontBold).fontSize(8).fillColor("#000000").text((order.consignorName || "ABC MANUFACTURING LTD.").toUpperCase(), margin + 6, y + 14, {
                width: printWidth - 12,
                ellipsis: true
            });

            const pickupLoc = order.pickupLocation ? `Hub: ${order.pickupLocation}` : "DEFAULT WAREHOUSE HUB, NOIDA, UP - 201301";
            doc.font(fontNormal).fontSize(7.5).text(pickupLoc, margin + 6, y + 25, {
                width: printWidth - 12,
                ellipsis: true
            });

            y += shipperHeight;

            // ================= 5. PACKAGE & MANIFEST SPECIFICATIONS =================
            const metaHeight = 45;
            doc.rect(margin, y, printWidth, metaHeight).stroke();

            const colWidth = printWidth / 3;

            // Column Dividers
            doc.moveTo(margin + colWidth, y).lineTo(margin + colWidth, y + metaHeight).stroke();
            doc.moveTo(margin + (colWidth * 2), y).lineTo(margin + (colWidth * 2), y + metaHeight).stroke();

            // Col 1: Quantity & Weight
            doc.font(fontBold).fontSize(6.5).fillColor("#475569").text("QTY & WEIGHT", margin + 4, y + 5);
            doc.font(fontNormal).fontSize(8.5).fillColor("#000000").text(`${order.qty || 1} PKG | ${order.weight || 0.5} KG`, margin + 4, y + 20);

            // Col 2: Invoice No
            doc.font(fontBold).fontSize(6.5).fillColor("#475569").text("INVOICE NO", margin + colWidth + 4, y + 5);
            doc.font(fontNormal).fontSize(8).fillColor("#000000").text(order.invoiceNo || "-", margin + colWidth + 4, y + 20, {
                width: colWidth - 8,
                ellipsis: true
            });

            // Col 3: Invoice Value (Shifted here from top header)
            doc.font(fontBold).fontSize(6.5).fillColor("#475569").text("INVOICE VALUE", margin + (colWidth * 2) + 4, y + 5);
            doc.font(fontBold).fontSize(9.5).fillColor("#000000").text(`Rs ${order.invoiceValue || 0}`, margin + (colWidth * 2) + 4, y + 20);

            y += metaHeight;

            // ================= 6. ITEM BREAKDOWN & PAYMENT MODE FOOTER =================
            const footerHeight = (LABEL_HEIGHT - margin) - y;
            doc.rect(margin, y, printWidth, footerHeight).stroke();

            let itemSummary = "ITEMS: ";
            if (order.orderItems && order.orderItems.length > 0) {
                itemSummary += order.orderItems.map(item => `${item.name} (x${item.units || 1})`).join(", ");
            } else {
                itemSummary += "General Parcel Goods";
            }

            doc.font(fontNormal).fontSize(7).fillColor("#334155").text(itemSummary, margin + 6, y + 5, {
                width: printWidth - 12,
                height: 16,
                ellipsis: true
            });

            // Courier Name + Destination City Strip
            const courierNameStr = (order.shipping?.courierName || "SURFACE").toUpperCase();
            const destCityStr = (order.destinationCity || "ROI").toUpperCase();
            const destStateStr = (order.destinationState || "IN").toUpperCase();

            doc.font(fontBold).fontSize(8).fillColor("#000000").text(
                `COURIER: ${courierNameStr} | DEST: ${destCityStr} (${destStateStr})`,
                margin + 6,
                y + 25,
                { width: printWidth - 80, ellipsis: true }
            );

            // Payment Type Badge on Footer Right
            const paymentType = (order.paymentMethod || "COD").toUpperCase();
            doc.font(fontBold).fontSize(10).fillColor("#000000").text(
                `[ ${paymentType} ]`,
                margin + printWidth - 75,
                y + 24,
                { width: 70, align: "right" }
            );
        }

        doc.end();

    } catch (err) {
        console.error("Label Generation Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: "Thermal label generation failed" });
        }
    }
};

module.exports = generateLabel;
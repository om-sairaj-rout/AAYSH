const PDFDocument = require("pdfkit");
const bwipjs = require("bwip-js");
const path = require("path");
const fs = require("fs");
const Order = require("../../models/upload/order.model"); 
const Shipping = require("../../models/upload/shipping.model");
const User = require("../../models/user.model");
const Company = require("../../models/company.model");
const { formatDisplayDate } = require("../../utils/dateTime");

const drawBrandBlock = (doc, { logoPath, brandName, x, y, width, height, fontBold }) => {
    if (logoPath && fs.existsSync(logoPath)) {
        doc.image(logoPath, x, y, {
            fit: [width, height],
            align: "center",
            valign: "center",
        });
        return;
    }

    let fontSize = 14;
    while (fontSize >= 8) {
        doc.font(fontBold).fontSize(fontSize);
        const textHeight = doc.heightOfString(brandName, { width });
        if (textHeight <= height) break;
        fontSize -= 1;
    }

    doc.font(fontBold)
        .fontSize(fontSize)
        .fillColor("#1E293B")
        .text(brandName, x, y + Math.max(0, (height - doc.heightOfString(brandName, { width })) / 2), {
            width,
            align: "center",
        });
};

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

        const userIds = [...new Set(orders.map((order) => String(order.uploadedBy)).filter(Boolean))];
        const companyIds = [...new Set(orders.map((order) => order.companyID).filter(Boolean))];

        const [sellers, companies] = await Promise.all([
            User.find({ _id: { $in: userIds } }).lean(),
            Company.find({ companyID: { $in: companyIds } }).lean(),
        ]);

        const sellerMap = new Map(sellers.map((seller) => [String(seller._id), seller]));
        const companyMap = new Map(companies.map((company) => [company.companyID, company]));

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
            const seller = sellerMap.get(String(order.uploadedBy)) || null;
            const company = companyMap.get(order.companyID) || null;
            const brandName = (seller?.companyName || company?.companyName || "AAYSH EXPRESS").toUpperCase();
            const logoFile = seller?.logo || company?.logo || "";
            const logoPath = logoFile ? path.join(__dirname, "../../assets", logoFile) : null;
            const courierNameStr = (order.shipping?.courierName || "SURFACE").toUpperCase();

            if (i > 0) doc.addPage();

            // Outer Perimeter Boundary Line
            doc.lineWidth(1)
               .strokeColor("#000000")
               .rect(margin, margin, printWidth, LABEL_HEIGHT - (margin * 2))
               .stroke();

            // ================= 0. AAYSH EXPRESS TOP BORDER STRAP =================
            const strapHeight = 16;
            doc.rect(margin, margin, printWidth, strapHeight)
               .fillColor("#0F172A")
               .fill();

            doc.font(fontBold)
               .fontSize(9)
               .fillColor("#FFFFFF")
               .text("AAYSH EXPRESS", margin, margin + 4, {
                   width: printWidth,
                   align: "center"
               });

            // Start content Y position right below the top strap
            let y = margin + strapHeight;

            // ================= 1. BRANDING & ORDER META HEADER =================
            const headerHeight = 58;
            doc.rect(margin, y, printWidth, headerHeight).strokeColor("#000000").stroke();

            const brandWidth = printWidth - 100;
            drawBrandBlock(doc, {
                logoPath,
                brandName,
                x: margin + 4,
                y: y + 4,
                width: brandWidth - 8,
                height: headerHeight - 8,
                fontBold,
            });

            const rightHeaderX = margin + brandWidth;
            doc.moveTo(rightHeaderX, y).lineTo(rightHeaderX, y + headerHeight).stroke();

            doc.font(fontBold).fontSize(6).fillColor("#475569").text("ORDER DATE", rightHeaderX + 4, y + 6, {
                width: 92,
                align: "center",
            });

            const formattedOrderDate = order.orderDate ? formatDisplayDate(order.orderDate) : "N/A";
            doc.font(fontBold).fontSize(8.5).fillColor("#000000").text(formattedOrderDate, rightHeaderX + 4, y + 16, {
                width: 92,
                align: "center",
            });

            doc.font(fontBold).fontSize(6).fillColor("#475569").text("COURIER", rightHeaderX + 4, y + 32, {
                width: 92,
                align: "center",
            });

            doc.font(fontBold).fontSize(8).fillColor("#000000").text(courierNameStr, rightHeaderX + 4, y + 41, {
                width: 92,
                align: "center",
                lineGap: 0,
            });

            y += headerHeight;

            // ================= 2. MAIN AWB BARCODE SECTION =================
            const barcodeBoxHeight = 64;
            doc.rect(margin, y, printWidth, barcodeBoxHeight).stroke();

            const awbNo = order.shipping?.awbNumber;

            try {
                // Barcode generated directly from AWB Number
                const barcodeBuffer = await bwipjs.toBuffer({
                    bcid: "code128",
                    text: String(awbNo || ""),
                    scale: 3,
                    height: 12,
                    includetext: false
                });

                const bcRenderWidth = 210;
                const bcX = margin + (printWidth / 2) - (bcRenderWidth / 2);

                doc.image(barcodeBuffer, bcX, y + 8, { width: bcRenderWidth, height: 38 });

                // Text AWB Readout
                doc.font(fontMono).fontSize(12).fillColor("#000000").text(awbNo || "", margin, y + 50, {
                    align: "center",
                    width: printWidth
                });

            } catch (bcErr) {
                console.error("Barcode Generation Error:", bcErr);
                doc.font(fontBold).fontSize(10).fillColor("#000000").text(`AWB: ${awbNo}`, margin, y + 25, {
                    align: "center",
                    width: printWidth
                });
            }

            y += barcodeBoxHeight;

            // ================= 3. CONSIGNEE / SHIP TO ADDRESS =================
            const consigneeHeight = 94;
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
                height: 26,
                lineGap: 1,
            });

            const destinationLine = `${(order.destinationCity || '').toUpperCase()}, ${(order.destinationState || '').toUpperCase()} - ${order.destinationPincode || ''}`;
            doc.font(fontBold).fontSize(9).text(destinationLine, margin + 6, y + 58, {
                width: printWidth - 12,
            });

            const phoneStr = order.billingPhone || order.contactNo || "N/A";
            doc.font(fontNormal).fontSize(8).text(`TEL: ${phoneStr}`, margin + 6, y + 76);

            y += consigneeHeight;

            // ================= 4. SHIPPER / CONSIGNOR DETAILS =================
            const shipperHeight = 54;
            doc.rect(margin, y, printWidth, shipperHeight).stroke();

            doc.font(fontBold).fontSize(6.5).fillColor("#475569").text("RETURN ADDRESS (CONSIGNOR):", margin + 6, y + 4);

            const consignorName = (order.consignorName || company?.companyName || brandName).toUpperCase();
            doc.font(fontBold).fontSize(7.5).fillColor("#000000").text(consignorName, margin + 6, y + 13, {
                width: printWidth - 12,
            });

            const returnAddressParts = [
                company?.address || order.shipping?.pickupLocation || "",
                company?.city,
                company?.state,
                company?.zip_code || company?.pincode,
            ].filter(Boolean);

            const returnAddressLine = returnAddressParts.length
                ? returnAddressParts.join(", ").toUpperCase()
                : (order.shipping?.pickupLocation || "DEFAULT WAREHOUSE HUB").toUpperCase();

            doc.font(fontNormal).fontSize(7).fillColor("#000000").text(returnAddressLine, margin + 6, y + 24, {
                width: printWidth - 12,
                height: 26,
                lineGap: 0.5,
            });

            y += shipperHeight;

            // ================= 5. PACKAGE & MANIFEST SPECIFICATIONS =================
            const metaHeight = 42;
            doc.rect(margin, y, printWidth, metaHeight).stroke();

            const colWidth = printWidth / 3;

            // Column Dividers
            doc.moveTo(margin + colWidth, y).lineTo(margin + colWidth, y + metaHeight).stroke();
            doc.moveTo(margin + (colWidth * 2), y).lineTo(margin + (colWidth * 2), y + metaHeight).stroke();

            // Col 1: Quantity & Weight
            doc.font(fontBold).fontSize(6.5).fillColor("#475569").text("QTY & WEIGHT", margin + 4, y + 5);
            doc.font(fontNormal).fontSize(8.5).fillColor("#000000").text(`${order.noOfBoxes || 1} PKG | ${order.chargeableWeight || order.weight || 0.5} KG`, margin + 4, y + 20);

            // Col 2: Invoice No
            doc.font(fontBold).fontSize(6.5).fillColor("#475569").text("INVOICE NO", margin + colWidth + 4, y + 5);
            doc.font(fontNormal).fontSize(8).fillColor("#000000").text(order.invoiceNo || "-", margin + colWidth + 4, y + 20, {
                width: colWidth - 8,
                ellipsis: true
            });

            // Col 3: Invoice Value
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

            doc.font(fontNormal).fontSize(6.5).fillColor("#334155").text(itemSummary, margin + 6, y + 5, {
                width: printWidth - 12,
                height: 18,
                lineGap: 0,
            });

            const destCityStr = (order.destinationCity || "ROI").toUpperCase();
            const destStateStr = (order.destinationState || "IN").toUpperCase();

            doc.font(fontBold).fontSize(7.5).fillColor("#000000").text(
                `DEST: ${destCityStr} (${destStateStr})`,
                margin + 6,
                y + 24,
                { width: printWidth - 80 }
            );

            // Payment Type Badge on Footer Right
            const paymentType = (order.paymentMethod || "COD").toUpperCase();
            doc.font(fontBold).fontSize(10).fillColor("#000000").text(
                `[ ${paymentType} ]`,
                margin + printWidth - 75,
                y + 21,
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
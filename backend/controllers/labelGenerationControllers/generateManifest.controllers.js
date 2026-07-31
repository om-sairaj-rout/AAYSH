const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");

const generateManifest = async (req, res) => {
    try {
        const { orderIds, courierName } = req.body;

        if (!orderIds || orderIds.length === 0) {
            return res.status(400).json({ success: false, message: "No order IDs provided" });
        }

        // Fetch orders and shipping details
        const orders = await Order.find({ _id: { $in: orderIds } }).lean();
        const shippings = await Shipping.find({ orderId: { $in: orderIds } }).lean();

        const shippingMap = new Map(
            shippings.map(s => [s.orderId.toString(), s])
        );

        orders.forEach(order => {
            order.shipping = shippingMap.get(order._id.toString()) || null;
        });

        if (!orders || orders.length === 0) {
            return res.status(404).json({ success: false, message: "Orders not found" });
        }

        const doc = new PDFDocument({ margin: 25, size: "A4" });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=shiprocket_manifest.pdf");

        doc.pipe(res);

        const fontBold = "Helvetica-Bold";
        const fontNormal = "Helvetica";

        const margin = 25;
        const printWidth = doc.page.width - (margin * 2); // ~545 pt
        const pageHeight = doc.page.height;

        // Dynamic Details
        const manifestId = `MANIFEST-${Date.now().toString().slice(-4)}`;
        const courier = courierName || orders[0]?.shipping?.courierName || "Xpressbees Surface";
        const sellerName = orders[0]?.sellerName || "FIBERISE FIT PRIVATE LIMITED";
        const sellerAddress = orders[0]?.pickupAddress || "A 153, Sector 136, Noida, Uttar Pradesh - 201304";
        const sellerContact = orders[0]?.sellerContact || "8679036275";

        const drawHeader = (yPos) => {
            // Header Title
            doc.font(fontBold).fontSize(16).fillColor("#000000").text("Shiprocket Manifest", margin, yPos);
            
            // Subhead: Generated Date
            const nowFormatted = new Date().toLocaleString("en-US", {
                month: "long", day: "numeric", year: "numeric",
                hour: "numeric", minute: "2-digit", hour12: true
            });
            doc.font(fontNormal).fontSize(8.5).fillColor("#333333").text(`Generated on: ${nowFormatted}`, margin, yPos + 18);

            // Right Meta Box Details
            const rightX = margin + printWidth - 220;
            doc.font(fontNormal).fontSize(9).fillColor("#000000");
            doc.text(`Seller: `, rightX, yPos, { continued: true }).font(fontBold).text(sellerName);
            doc.font(fontNormal).text(`Courier: `, rightX, yPos + 13, { continued: true }).font(fontBold).text(courier);
            doc.font(fontBold).text(`Manifest ID: ${manifestId}`, rightX, yPos + 26);
            doc.font(fontBold).text(`Total shipments to dispatch: ${orders.length}`, rightX, yPos + 39);

            // Divider Line
            doc.moveTo(margin, yPos + 55).lineTo(margin + printWidth, yPos + 55).strokeColor("#CCCCCC").lineWidth(0.75).stroke();

            return yPos + 65;
        };

        let y = drawHeader(margin);

        // ================= ORDERS TABLE HEADER =================
        const drawTableHeader = (yPos) => {
            doc.rect(margin, yPos, printWidth, 20).fillColor("#F2F2F2").fill();
            doc.rect(margin, yPos, printWidth, 20).strokeColor("#000000").lineWidth(0.5).stroke();

            doc.font(fontBold).fontSize(8.5).fillColor("#000000");
            doc.text("S.no", margin + 6, yPos + 6);
            doc.text("Order no", margin + 45, yPos + 6);
            doc.text("Contents", margin + 145, yPos + 6);
            doc.text("Awb no", margin + 295, yPos + 6);
            doc.text("Barcode", margin + 435, yPos + 6);

            return yPos + 20;
        };

        y = drawTableHeader(y);

        // ================= TABLE ROWS =================
        const rowHeight = 35;
        const maxTableY = pageHeight - 160; // Leave room for Shiprocket bottom confirmation block

        for (let i = 0; i < orders.length; i++) {
            const order = orders[i];

            if (y + rowHeight > maxTableY) {
                doc.addPage();
                y = drawHeader(margin);
                y = drawTableHeader(y);
            }

            doc.rect(margin, y, printWidth, rowHeight).strokeColor("#000000").lineWidth(0.5).stroke();

            const orderNo = order.externalOrderId || order.orderNumber || "2782";
            const contents = order.itemsSummary || "Starter pack (SKU-Test Pack)";
            const awbNo = order.shipping?.awbNumber || "14112366160873";

            doc.font(fontNormal).fontSize(8.5).fillColor("#000000");
            
            // Checkbox + S.no
            doc.rect(margin + 6, y + 12, 9, 9).stroke();
            doc.text(`${i + 1}`, margin + 20, y + 12);

            // Order No
            doc.text(orderNo, margin + 45, y + 12, { width: 90, ellipsis: true });

            // Contents
            doc.text(contents, margin + 145, y + 12, { width: 140, ellipsis: true });

            // AWB No
            doc.text(awbNo, margin + 295, y + 12, { width: 130, ellipsis: true });

            // Barcode Text Placeholder (Or Barcode image rendering)
            doc.font(fontNormal).fontSize(7.5).text(`|||||||||||||||||||||||`, margin + 435, y + 10);
            doc.font(fontNormal).fontSize(7).text(awbNo, margin + 435, y + 20);

            y += rowHeight;
        }

        // ================= HANDOVER ACKNOWLEDGMENT BOX =================
        const footerY = pageHeight - 140;
        const footerHeight = 115;

        doc.rect(margin, footerY, printWidth, footerHeight).strokeColor("#000000").lineWidth(0.75).stroke();

        // Subheader Title
        doc.font(fontBold).fontSize(8.5).text(`To Be Filled By ${courier} Executive`, margin + 10, footerY + 8);

        const colWidth = printWidth / 2;

        // --- Left Column: Field Executive (FE) Details ---
        doc.font(fontNormal).fontSize(8);
        doc.text("Pick up time: ________________________", margin + 10, footerY + 25);
        doc.text("FE Name: ___________________________", margin + 10, footerY + 42);
        doc.text("FE Signature: _______________________", margin + 10, footerY + 59);
        doc.text("FE Phone: __________________________", margin + 10, footerY + 76);
        doc.text("Total items picked: __________________", margin + 10, footerY + 93);

        // --- Right Column: Seller Details & Signature ---
        const rightColX = margin + colWidth + 10;
        
        doc.font(fontNormal).fontSize(8);
        doc.text("Seller Name: ", rightColX, footerY + 25, { continued: true })
           .font(fontBold).text(sellerName);

        doc.font(fontNormal).text("Seller Signature: ____________________", rightColX, footerY + 42);
        
        // Seller Address Block
        doc.font(fontNormal).fontSize(7.5).fillColor("#333333");
        doc.text(sellerAddress, rightColX, footerY + 58, { width: colWidth - 20 });
        doc.text(`Contact: ${sellerContact}`, rightColX, footerY + 82);

        // Footer note
        doc.font(fontNormal).fontSize(7).fillColor("#666666").text("This is a system generated document", margin, pageHeight - 18, { align: "center" });

        doc.end();

    } catch (err) {
        console.error("Manifest Generation Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: "Cargo manifest generation failed" });
        }
    }
};

module.exports = generateManifest;
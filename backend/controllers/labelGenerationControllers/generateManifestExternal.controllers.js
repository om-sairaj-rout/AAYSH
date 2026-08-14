const PDFDocument = require("pdfkit");
const bwipjs = require("bwip-js");
const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const User = require("../../models/user.model");
const { formatDisplayDateTime } = require("../../utils/dateTime");

const drawBarcode128 = async (doc, code, x, y) => {
    if (!code) return;

    const png = await bwipjs.toBuffer({
        bcid: "code128",
        text: String(code),
        scale: 2,
        height: 12,
        includetext: false,
    });

    doc.image(png, x, y, {
        width: 105,
        height: 28,
    });
};

const generateManifest = async (req, res) => {
    try {
        const { shipmentIds, courierName } = req.body;

        if (!shipmentIds || shipmentIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No shipment IDs provided"
            });
        }

        // Fetch shipment records using external logic
        const shippings = await Shipping.find({
            shipmentId: { $in: shipmentIds }
        }).lean();

        if (!shippings.length) {
            return res.status(404).json({
                success: false,
                message: "Shipments not found"
            });
        }

        // Get corresponding order ids
        const orderIds = shippings.map(shipment => shipment.orderId);

        // Fetch orders
        const orders = await Order.find({
            _id: { $in: orderIds }
        }).lean();

        if (!orders.length) {
            return res.status(404).json({
                success: false,
                message: "Orders not found"
            });
        }

        // Fetch seller details (using first order's uploadedBy)
        const seller = await User.findById(
            orders[0].uploadedBy
        ).lean();

        if (!seller) {
            return res.status(404).json({
                success: false,
                message: "Seller not found"
            });
        }

        // Attach shipping object to each order
        const shippingMap = new Map(
            shippings.map(shipment => [
                shipment.orderId.toString(),
                shipment
            ])
        );

        orders.forEach(order => {
            order.shipping = shippingMap.get(order._id.toString()) || null;
        });

        // Set autoFirstPage to true and disable automatic page creation (matching internal style)
        const doc = new PDFDocument({ margin: 25, size: "A4", autoFirstPage: true });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=aaysh_express_manifest.pdf");

        doc.pipe(res);

        const fontBold = "Helvetica-Bold";
        const fontNormal = "Helvetica";

        const margin = 25;
        const printWidth = doc.page.width - (margin * 2); // ~545 pt
        const pageHeight = doc.page.height;

        // Dynamic Details
        const manifestId = `MANIFEST-${Date.now().toString().slice(-4)}`;
        const courier = courierName || orders[0]?.shipping?.courierName || "Xpressbees Surface";
        const sellerName = seller.companyName || "N/A";

        const sellerAddress = [
            seller.address,
            seller.city,
            `${seller.state} - ${seller.zip_code}`,
            seller.country,
        ]
        .filter(Boolean)
        .join(", ");

        const sellerContact = seller.mobile_number;

        const drawHeader = (yPos) => {
            // ================= 1. CENTER BRAND HEADER =================
            const titleY = yPos + 5;

            doc.font(fontBold).fontSize(16);

            // Calculate text widths
            const aayshWidth = doc.widthOfString("AAYSH ");
            const expressWidth = doc.widthOfString("EXPRESS");
            const totalWidth = aayshWidth + expressWidth;

            // Center both words together
            const startX = (doc.page.width - totalWidth) / 2;

            // Draw AAYSH
            doc.fillColor("#0F172A");
            doc.text("AAYSH ", startX, titleY, {
                lineBreak: false
            });

            // Draw EXPRESS
            doc.fillColor("#0D9488");
            doc.text("EXPRESS", startX + aayshWidth, titleY, {
                lineBreak: false
            });

            // Subtitle
            doc.font(fontNormal)
               .fontSize(8)
               .fillColor("#64748B")
               .text(
                   "CARGO HANDOVER MANIFEST",
                   margin,
                   titleY + 22,
                   {
                       align: "center",
                       width: printWidth
                   }
               );

            // Subtitle Date
            const nowFormatted = formatDisplayDateTime(new Date());
            doc.font(fontNormal).fontSize(8.5).fillColor("#475569");
            doc.text(`Generated on: ${nowFormatted}`, margin, titleY + 30, { align: "center", width: printWidth });

            const row2Y = titleY + 48;

            // ================= 2. LEFT & RIGHT METADATA ROW =================
            // Left Column: Seller & Courier
            doc.font(fontNormal).fontSize(9).fillColor("#000000");
            doc.text("Seller: ", margin, row2Y, { continued: true }).font(fontBold).text(sellerName);
            doc.font(fontNormal).text("Courier: ", margin, row2Y + 14, { continued: true }).font(fontBold).text(courier);

            // Right Column: Manifest ID & Total Shipments
            const rightX = margin + printWidth - 220;
            doc.font(fontBold).fontSize(9).fillColor("#000000");
            doc.text(`Manifest ID: ${manifestId}`, rightX, row2Y, { align: "right", width: 220 });
            doc.text(`Total shipments to dispatch: ${orders.length}`, rightX, row2Y + 14, { align: "right", width: 220 });

            // Divider Line
            doc.moveTo(margin, row2Y + 32).lineTo(margin + printWidth, row2Y + 32).strokeColor("#CCCCCC").lineWidth(0.75).stroke();

            return row2Y + 40;
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
            doc.text("Barcode", margin + 430, yPos + 6);

            return yPos + 20;
        };

        y = drawTableHeader(y);

        // ================= TABLE ROWS =================
        const rowHeight = 35;

        for (let i = 0; i < orders.length; i++) {
            const order = orders[i];

            doc.rect(margin, y, printWidth, rowHeight).strokeColor("#000000").lineWidth(0.5).stroke();

            const orderNo = order.externalOrderId || order.orderNumber || "2782";
            const contents = order.orderItems?.length
                ? order.orderItems.map(item => item.name || item.sku).join(", ")
                : "General Parcel";
            const awbNo = String(order.shipping?.awbNumber || "");

            doc.font(fontNormal).fontSize(8.5).fillColor("#000000");
            
            // Checkbox + S.no
            doc.rect(margin + 6, y + 12, 9, 9).stroke();
            doc.text(`${i + 1}`, margin + 20, y + 12);

            // Order No
            doc.text(orderNo, margin + 45, y + 12, { width: 90, ellipsis: true });

            // Contents
            doc.text(contents, margin + 145, y + 12, { width: 140, ellipsis: true });

            // AWB No
            doc.text(awbNo, margin + 295, y + 12, { width: 125, ellipsis: true });

            // Clean Vector Barcode
            await drawBarcode128(
                doc,
                awbNo,
                margin + 425,
                y + 4
            );

            y += rowHeight;
        }

        // ================= FOOTER HANDOVER ACKNOWLEDGMENT BOX =================
        const footerY = pageHeight - 145;
        const footerHeight = 120;

        doc.rect(margin, footerY, printWidth, footerHeight).strokeColor("#000000").lineWidth(0.75).stroke();

        // Subheader Title
        doc.font(fontBold).fontSize(8.5).fillColor("#000000").text(`To Be Filled By ${courier} Executive`, margin + 8, footerY + 10);

        const colWidth = printWidth / 2;

        // --- Left Column: Field Executive (FE) Details ---
        doc.font(fontNormal).fontSize(8);
        doc.text("Pick up time: ________________________", margin + 8, footerY + 22);
        doc.text("FE Name: ___________________________", margin + 8, footerY + 39);
        doc.text("FE Signature: _______________________", margin + 8, footerY + 56);
        doc.text("FE Phone: __________________________", margin + 8, footerY + 73);
        doc.text("Total items picked: __________________", margin + 8, footerY + 90);

        // --- Right Column: Seller Details, Signature, Address & Phone ---
        const rightColX = margin + colWidth + 8;
        
        doc.font(fontNormal).fontSize(8);
        doc.text("Seller Name: ", rightColX, footerY + 22, { continued: true })
           .font(fontBold).text(sellerName);

        // Seller Signature Line
        doc.font(fontNormal).text("Seller Signature: ____________________", rightColX, footerY + 39);
        
        // Address Block positioned directly below Seller Signature
        doc.font(fontNormal).fontSize(7.5).fillColor("#333333");
        doc.text(
            sellerAddress,
            rightColX,
            footerY + 56,
            {
                width: colWidth - 16
            }
        );

        // Position after address
        const contactY = doc.y + 5;

        doc.font(fontBold)
           .fontSize(8)
           .fillColor("#000000")
           .text(
               `Contact: ${sellerContact || "N/A"}`,
               rightColX,
               contactY
           );

        doc.end();

    } catch (err) {
        console.error("Manifest Generation Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: "Cargo manifest generation failed" });
        }
    }
};

module.exports = generateManifest;
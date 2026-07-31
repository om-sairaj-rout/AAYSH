const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");

// Helper function to draw dynamic Code 128 (Pattern-B) vector barcodes in PDFKit
const drawBarcode128 = (doc, code, x, y, options = {}) => {
    const height = options.height || 18;
    const widthFactor = options.widthFactor || 0.85;

    // Code 128 subset B mapping table (patterns of bar/space widths)
    const CODE128_PATTERNS = [
        "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312",
        "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222",
        "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131",
        "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321",
        "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
        "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121",
        "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321",
        "313112", "331121", "312113", "312311", "332111", "314111", "221411", "431111",
        "111224", "111422", "121124", "121421", "141122", "141221", "112214", "112412",
        "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112",
        "134111", "111242", "121142", "121241", "114212", "124112", "124211", "411212",
        "421112", "421211", "212141", "214121", "412121", "111143", "111341", "131141",
        "114113", "114311", "411113", "411311", "113141", "114131", "311141", "411131",
        "211412", "211214", "211232", "2331112"
    ];

    let checkSum = 104; // Start Code B index
    const codeUnits = [104];

    for (let i = 0; i < code.length; i++) {
        const codeVal = code.charCodeAt(i) - 32;
        codeUnits.push(codeVal);
        checkSum += codeVal * (i + 1);
    }

    codeUnits.push(checkSum % 103);
    codeUnits.push(106); // Stop pattern index

    let currX = x;
    doc.fillColor("#000000");

    codeUnits.forEach((unitIndex) => {
        const pattern = CODE128_PATTERNS[unitIndex];
        if (!pattern) return;

        for (let p = 0; p < pattern.length; p++) {
            const width = parseInt(pattern[p], 10) * widthFactor;
            if (p % 2 === 0) { // Bar
                doc.rect(currX, y, width, height).fill();
            }
            currX += width;
        }
    });
};

const generateManifest = async (req, res) => {
    try {
        const { orderIds, courierName } = req.body;

        if (!orderIds || orderIds.length === 0) {
            return res.status(400).json({ success: false, message: "No order IDs provided" });
        }

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
        const sellerName = orders[0]?.sellerName || "FIBERISE FIT PRIVATE LIMITED";
        const sellerAddress = orders[0]?.pickupAddress || "A 153, Sector 136, Noida, Meerut Division, Uttar Pradesh - 201304 pride corporate park Gautam Buddha Nagar, Uttar Pradesh-201304.";
        const sellerContact = orders[0]?.sellerContact || "8679036275";

        const drawHeader = (yPos) => {
            // ================= 1. CENTER LOGO HEADER =================
            const logoPath = path.join(__dirname, "../../assets/aaysh_logo_2.png");
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, (doc.page.width - 150) / 2, yPos, { width: 150, align: "center" });
            } else {
                // Fallback Centered Text Logo
                doc.font(fontBold).fontSize(18).fillColor("#0F172A");
                doc.text("AAYSH EXPRESS", margin, yPos, { align: "center", width: printWidth });
            }

            // Subtitle Date
            const nowFormatted = new Date().toLocaleString("en-US", {
                month: "long", day: "numeric", year: "numeric",
                hour: "numeric", minute: "2-digit", hour12: true
            });
            doc.font(fontNormal).fontSize(8.5).fillColor("#475569");
            doc.text(`Generated on: ${nowFormatted}`, margin, yPos + 32, { align: "center", width: printWidth });

            const row2Y = yPos + 50;

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
            doc.moveTo(margin, row2Y + 34).lineTo(margin + printWidth, row2Y + 34).strokeColor("#CCCCCC").lineWidth(0.75).stroke();

            return row2Y + 42;
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
        const rowHeight = 38;
        const maxTableY = pageHeight - 165; 

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
            doc.rect(margin + 6, y + 13, 9, 9).stroke();
            doc.text(`${i + 1}`, margin + 20, y + 13);

            // Order No
            doc.text(orderNo, margin + 45, y + 13, { width: 90, ellipsis: true });

            // Contents
            doc.text(contents, margin + 145, y + 13, { width: 140, ellipsis: true });

            // AWB No
            doc.text(awbNo, margin + 295, y + 13, { width: 125, ellipsis: true });

            // Clean Vector Barcode
            drawBarcode128(doc, awbNo, margin + 430, y + 8, { height: 16, widthFactor: 0.75 });
            doc.font(fontNormal).fontSize(7).fillColor("#333333").text(awbNo, margin + 430, y + 26);

            y += rowHeight;
        }

        // ================= FOOTER HANDOVER ACKNOWLEDGMENT BOX =================
        const footerY = pageHeight - 145;
        const footerHeight = 120;

        doc.rect(margin, footerY, printWidth, footerHeight).strokeColor("#000000").lineWidth(0.75).stroke();

        // Subheader Title
        doc.font(fontBold).fontSize(8.5).fillColor("#000000").text(`To Be Filled By ${courier} Executive`, margin + 8, footerY + 6);

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

        doc.font(fontNormal).text("Seller Signature: ____________________", rightColX, footerY + 39);
        
        // Address Block & Contact Details
        doc.font(fontNormal).fontSize(7.5).fillColor("#333333");
        doc.text(sellerAddress, rightColX, footerY + 55, { width: colWidth - 16, height: 35 });
        doc.font(fontBold).fontSize(8).fillColor("#000000").text(`Contact: ${sellerContact}`, rightColX, footerY + 95);

        // System Generated Document Note
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
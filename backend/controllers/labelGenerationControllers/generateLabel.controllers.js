const PDFDocument = require("pdfkit");
const bwipjs = require("bwip-js");
const Order = require("../../models/upload/order.model"); 

const generateLabel = async (req, res) => {
    try {
        const { orderIds } = req.body;

        if (!orderIds || orderIds.length === 0) {
            return res.status(400).json({ success: false, message: "No order IDs provided" });
        }

        const orders = await Order.find({ _id: { $in: orderIds } });

        if (!orders || orders.length === 0) {
            return res.status(404).json({ success: false, message: "Orders not found" });
        }

        const doc = new PDFDocument({
            margin: 0, 
            size: "A6" 
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=labels.pdf");

        doc.pipe(res);

        const fontBold = "Helvetica-Bold";
        const fontNormal = "Helvetica";
        const fontMono = "Courier-Bold";

        const labelWidth = doc.page.width;
        const labelHeight = doc.page.height;
        const margin = 15;
        const internalWidth = labelWidth - (margin * 2);

        for (let i = 0; i < orders.length; i++) {
            const order = orders[i];

            if (!order.awbNumber) {
                throw new Error(`AWB missing for order ${order._id}`);
            }

            if (i > 0) doc.addPage();

            // External Perimeter Border Box
            doc.lineWidth(1).lineJoin('miter').rect(margin, margin, internalWidth, labelHeight - (margin * 2)).stroke();

            let y = margin;

            // ================= SHIPPERS & DATES HEADER =================
            let headerHeight = 55;
            doc.rect(margin, y, internalWidth, headerHeight).stroke();

            doc.font(fontBold).fontSize(8).text("SHIPPER / CONSIGNOR", margin + 5, y + 5);
            doc.font(fontNormal).fontSize(7).text("ABC Manufacturing Ltd.", margin + 5, y + 17);
            doc.text("45 Science Park Drive,", margin + 5, y + 26);
            doc.text("Tech City, CA 94043", margin + 5, y + 35);

            let dateDividerX = margin + (internalWidth * 0.60);
            doc.moveTo(dateDividerX, y).lineTo(dateDividerX, y + headerHeight).stroke();

            const pickupDateText = order.pickupDate ? new Date(order.pickupDate).toLocaleDateString('en-GB') : "N/A";
            doc.font(fontBold).fontSize(8).text("PICKUP DATE", dateDividerX + 5, y + 5);
            doc.font(fontNormal).fontSize(9).text(pickupDateText, dateDividerX + 5, y + 17);

            y += headerHeight;

            // ================= CONSIGNEE / ADDRESS =================
            let consigneeHeight = 100;
            doc.rect(margin, y, internalWidth, consigneeHeight).stroke();

            doc.font(fontBold).fontSize(9).text("TO / CONSIGNEE", margin + 5, y + 7);
            doc.fontSize(12).text((order.consigneeName || "").toUpperCase(), margin + 5, y + 20);

            doc.font(fontNormal).fontSize(10);
            const addressY = y + 36;
            doc.text((order.address || "").toUpperCase(), margin + 5, addressY, { width: internalWidth - 10 });
            
            const cityLine = `${(order.destinationCity || "").toUpperCase()}, ${(order.destinationState || "").toUpperCase()} ${order.destinationPincode || ""}`;
            doc.text(cityLine, margin + 5, addressY + 35);
            doc.text(`Contact: ${order.contactNo || "-"}`, margin + 5, addressY + 45);

            y += consigneeHeight;

            // ================= AWB SECTION =================
            let awbHeight = 45;
            doc.rect(margin, y, internalWidth, awbHeight).stroke();

            doc.font(fontBold).fontSize(10).text("AWB Number:", margin + 5, y + 7);
            doc.font(fontMono).fontSize(16).text(order.awbNumber || "NOAWB", margin + 5, y + 22);

            y += awbHeight;

            // ================= PARCEL DETAILS GRID (3 COLUMNS) =================
            let detailsHeight = 40;
            doc.rect(margin, y, internalWidth, detailsHeight).stroke();

            const colW = internalWidth / 3;
            doc.moveTo(margin + colW, y).lineTo(margin + colW, y + detailsHeight).stroke();
            doc.moveTo(margin + colW * 2, y).lineTo(margin + colW * 2, y + detailsHeight).stroke();

            // Headers
            doc.font(fontBold).fontSize(7);
            doc.text("Qty", margin + 5, y + 5);
            doc.text("Invoice No", margin + colW + 5, y + 5);
            doc.text("Value", margin + colW * 2 + 5, y + 5);

            // Row Values
            doc.font(fontNormal).fontSize(10);
            doc.text(`${order.qty || "1"} PKG`, margin + 5, y + 17);
            
            // FIX: Locked Invoice field bounding width limits down cleanly to stop bleeding over right margins
            doc.fontSize(8).text(
                order.invoiceNo || "-", 
                margin + colW + 5, 
                y + 17, 
                { width: colW - 10, height: 20, ellipsis: true }
            );
            
            doc.fontSize(10).text(`Rs${order.invoiceValue || "0.00"}`, margin + colW * 2 + 5, y + 17);

            y += detailsHeight;

            // ================= MAIN BARCODE SECTION =================
            let barcodeAreaHeight = 110; 
            
            try {
                const barcodeBuffer = await bwipjs.toBuffer({
                    bcid: "code128",       
                    text: order.awbNumber, 
                    scale: 3,              
                    height: 12,            
                    includetext: false, 
                });

                const barcodeWidth = 220; 
                const barcodeX = margin + (internalWidth / 2) - (barcodeWidth / 2);

                doc.image(barcodeBuffer, barcodeX, y + 8, {
                    width: barcodeWidth
                });

                doc.font(fontMono).fontSize(11).text(
                    order.awbNumber, 
                    margin, 
                    y + 90, 
                    { align: 'center', width: internalWidth }
                );

            } catch (bcError) {
                console.error(bcError);
                doc.font(fontBold).fontSize(11).text("BARCODE ERROR", margin, y + 30, { align: 'center', width: internalWidth });
            }

            y += barcodeAreaHeight;

            // ================= ROUTING FOOTER =================
            let footerHeight = labelHeight - margin - y; 
            doc.rect(margin, y, internalWidth, footerHeight).stroke();

            const destCity = (order.destinationCity || "").toUpperCase();
            const destState = (order.destinationState || "").toUpperCase();
            doc.font(fontBold).fontSize(11).text(`DEST: ${destCity} (${destState})`, margin + 5, y + 8);
            doc.font(fontNormal).fontSize(8).text("Fragile - Handle with Care", margin + 5, y + 23);
        }

        doc.end();

    } catch (err) {
        console.log(err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: "Label generation failed" });
        }
    }
};

module.exports = generateLabel;
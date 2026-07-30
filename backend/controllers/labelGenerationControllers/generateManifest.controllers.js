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

        // Fetch orders and populate shipping details
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

        // Standard A4 Dimensions in PDF Points (595.28 x 841.89 pt)
        const doc = new PDFDocument({
            margin: 30,
            size: "A4"
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=dispatch_manifest.pdf");

        doc.pipe(res);

        const fontBold = "Helvetica-Bold";
        const fontNormal = "Helvetica";
        const fontMono = "Courier-Bold";

        const margin = 30;
        const printWidth = doc.page.width - (margin * 2); // ~535.28 pt
        const pageHeight = doc.page.height;

        // Generate Manifest Metadata
        const manifestId = `MNF-${Date.now().toString().slice(-6)}`;
        const dispatchCourier = (courierName || orders[0]?.shipping?.courierName || "SURFACE LOGISTICS").toUpperCase();
        const warehouseLocation = orders[0]?.pickupLocation || "DEFAULT WAREHOUSE HUB, NOIDA, UP";

        // Calculated Total Manifest Metrics
        const totalPackages = orders.reduce((acc, o) => acc + (o.qty || 1), 0);
        const totalWeight = orders.reduce((acc, o) => acc + (o.weight || 0.5), 0).toFixed(2);
        const totalValue = orders.reduce((acc, o) => acc + (o.invoiceValue || 0), 0).toFixed(2);

        // Function to draw header on pages
        const drawHeader = (yPos) => {
            // Border Box Around Header
            doc.lineWidth(1).strokeColor("#0F172A").rect(margin, yPos, printWidth, 65).stroke();

            // Logo Header Zone
            const logoPath = path.join(__dirname, "../../assets/aaysh_logo_2.png");
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, margin + 10, yPos + 10, {
                    fit: [120, 45],
                    align: "left",
                    valign: "center"
                });
            } else {
                doc.font(fontBold).fontSize(16).fillColor("#0F172A").text("AAYSH", margin + 10, yPos + 15, { continued: true });
                doc.fillColor("#0D9488").text("EXPRESS");
                doc.font(fontNormal).fontSize(8).fillColor("#64748B").text("CARGO HANDOVER MANIFEST", margin + 10, yPos + 36);
            }

            // Right Title Block
            const rightX = margin + printWidth - 200;
            doc.font(fontBold).fontSize(14).fillColor("#0F172A").text("DISPATCH MANIFEST", rightX, yPos + 10, { align: "right", width: 190 });
            doc.font(fontNormal).fontSize(8.5).fillColor("#475569");
            doc.text(`Manifest ID: ${manifestId}`, rightX, yPos + 28, { align: "right", width: 190 });
            doc.text(`Date: ${new Date().toLocaleDateString('en-GB')} | ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, rightX, yPos + 40, { align: "right", width: 190 });

            return yPos + 75;
        };

        let y = drawHeader(margin);

        // ================= 1. SUMMARY METRICS BAR =================
        const metaHeight = 35;
        doc.lineWidth(0.5).strokeColor("#CBD5E1").rect(margin, y, printWidth, metaHeight).stroke();

        const colW = printWidth / 4;
        for (let c = 1; c < 4; c++) {
            doc.moveTo(margin + (colW * c), y).lineTo(margin + (colW * c), y + metaHeight).stroke();
        }

        // Col 1: Courier
        doc.font(fontBold).fontSize(6.5).fillColor("#64748B").text("COURIER PARTNER", margin + 6, y + 5);
        doc.font(fontBold).fontSize(9.5).fillColor("#0F172A").text(dispatchCourier, margin + 6, y + 18, { width: colW - 12, ellipsis: true });

        // Col 2: Warehouse Location
        doc.font(fontBold).fontSize(6.5).fillColor("#64748B").text("PICKUP WAREHOUSE", margin + colW + 6, y + 5);
        doc.font(fontNormal).fontSize(8).fillColor("#0F172A").text(warehouseLocation, margin + colW + 6, y + 18, { width: colW - 12, ellipsis: true });

        // Col 3: Total Manifest Shipments
        doc.font(fontBold).fontSize(6.5).fillColor("#64748B").text("TOTAL SHIPMENTS / PKGS", margin + (colW * 2) + 6, y + 5);
        doc.font(fontBold).fontSize(9).fillColor("#0F172A").text(`${orders.length} Orders (${totalPackages} Pkgs)`, margin + (colW * 2) + 6, y + 18);

        // Col 4: Total Weight & Value
        doc.font(fontBold).fontSize(6.5).fillColor("#64748B").text("TOTAL WEIGHT & VALUE", margin + (colW * 3) + 6, y + 5);
        doc.font(fontBold).fontSize(8.5).fillColor("#0F172A").text(`${totalWeight} KG | ₹${totalValue}`, margin + (colW * 3) + 6, y + 18);

        y += metaHeight + 15;

        // ================= 2. ORDERS TABLE HEADER =================
        const drawTableHeader = (yPos) => {
            doc.fillColor("#0F172A").rect(margin, yPos, printWidth, 22).fill();

            // Widths: 25pt, 105pt, 80pt, 125pt, 75pt, 45pt, 80pt
            doc.font(fontBold).fontSize(7.5).fillColor("#FFFFFF");
            doc.text("#", margin + 4, yPos + 7);
            doc.text("AWB NUMBER", margin + 25, yPos + 7);
            doc.text("INVOICE NO", margin + 130, yPos + 7);
            doc.text("CONSIGNEE & ADDRESS", margin + 210, yPos + 7);
            doc.text("DESTINATION", margin + 335, yPos + 7);
            doc.text("MODE", margin + 410, yPos + 7, { width: 35, align: "center" });
            doc.text("SIGN / RECV", margin + 450, yPos + 7, { width: 80, align: "center" });

            return yPos + 22;
        };

        y = drawTableHeader(y);

        // ================= 3. DISPATCH TABLE ROWS =================
        const rowHeight = 26;
        const maxTableY = pageHeight - 110; // Reserve space for acknowledgment footer

        doc.strokeColor("#E2E8F0").lineWidth(0.5);

        for (let i = 0; i < orders.length; i++) {
            const order = orders[i];

            // Check Page End Collision & Add New Page
            if (y + rowHeight > maxTableY) {
                doc.addPage();
                y = drawHeader(margin);
                y = drawTableHeader(y);
                doc.strokeColor("#E2E8F0").lineWidth(0.5);
            }

            // Alternating Row Fill
            if (i % 2 === 1) {
                doc.fillColor("#F8FAFC").rect(margin, y, printWidth, rowHeight).fill();
            }

            doc.rect(margin, y, printWidth, rowHeight).stroke();

            const awbNo = order.shipping?.awbNumber || order.externalOrderId || "N/A";
            const invoiceNo = order.invoiceNo || "-";
            const consignee = `${order.consigneeName || ''} ${order.consigneeLastName || ''}`.trim().toUpperCase() || "CUSTOMER";
            const destination = `${(order.destinationCity || 'ROI').toUpperCase()} - ${order.destinationPincode || ''}`;
            const payMode = (order.paymentMethod || "COD").toUpperCase();

            // Row Content Rendering
            doc.font(fontNormal).fontSize(8).fillColor("#0F172A");
            doc.text(`${i + 1}`, margin + 4, y + 8);

            doc.font(fontMono).fontSize(8.5).text(awbNo, margin + 25, y + 8, { width: 100, ellipsis: true });
            doc.font(fontNormal).fontSize(8).text(invoiceNo, margin + 130, y + 8, { width: 75, ellipsis: true });

            // Consignee Block
            doc.font(fontBold).fontSize(7.5).text(consignee, margin + 210, y + 4, { width: 120, ellipsis: true });
            doc.font(fontNormal).fontSize(6.5).fillColor("#475569").text(`Ph: ${order.billingPhone || order.contactNo || 'N/A'}`, margin + 210, y + 14, { width: 120, ellipsis: true });

            doc.font(fontNormal).fontSize(7.5).fillColor("#0F172A").text(destination, margin + 335, y + 8, { width: 70, ellipsis: true });
            doc.font(fontBold).fontSize(7.5).text(payMode, margin + 410, y + 8, { width: 35, align: "center" });

            // Empty Checkbox Tick Box for Pickup Verification
            doc.rect(margin + 480, y + 6, 14, 14).stroke();

            y += rowHeight;
        }

        // ================= 4. DRIVER & COURIER HANDOVER ACKNOWLEDGMENT =================
        const footerY = pageHeight - 90;

        doc.lineWidth(1).strokeColor("#0F172A").rect(margin, footerY, printWidth, 65).stroke();

        const ackColW = printWidth / 3;
        doc.moveTo(margin + ackColW, footerY).lineTo(margin + ackColW, footerY + 65).stroke();
        doc.moveTo(margin + (ackColW * 2), footerY).lineTo(margin + (ackColW * 2), footerY + 65).stroke();

        // Sign Col 1: Dispatch Executive
        doc.font(fontBold).fontSize(7).fillColor("#475569").text("DISPATCH EXECUTIVE (DISPATCHED BY)", margin + 6, footerY + 6);
        doc.font(fontNormal).fontSize(8).fillColor("#0F172A").text("Name: _______________________", margin + 6, footerY + 24);
        doc.text("Signature: ____________________", margin + 6, footerY + 44);

        // Sign Col 2: Pickup Driver Details
        doc.font(fontBold).fontSize(7).fillColor("#475569").text("COURIER DRIVER ACKNOWLEDGMENT", margin + ackColW + 6, footerY + 6);
        doc.font(fontNormal).fontSize(8).fillColor("#0F172A").text("Driver Name: __________________", margin + ackColW + 6, footerY + 20);
        doc.text("Vehicle No: ___________________", margin + ackColW + 6, footerY + 34);
        doc.text("Phone No: ____________________", margin + ackColW + 6, footerY + 48);

        // Sign Col 3: Courier Rubber Stamp / Sign
        doc.font(fontBold).fontSize(7).fillColor("#475569").text("COURIER STAMP & SIGNATURE", margin + (ackColW * 2) + 6, footerY + 6);
        doc.font(fontNormal).fontSize(7).fillColor("#94A3B8").text("Official Stamp Here", margin + (ackColW * 2) + 6, footerY + 32, { align: "center", width: ackColW - 12 });

        doc.end();

    } catch (err) {
        console.error("Manifest Generation Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: "Cargo manifest generation failed" });
        }
    }
};

module.exports = generateManifest;
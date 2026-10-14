const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  LevelFormat,
} = require("docx");

const hr = () =>
  new Paragraph({
    spacing: { before: 200, after: 200 },
    children: [
      new TextRun({
        text: "────────────────────────────────────────────────────────────────────────────",
        color: "999999",
        size: 18,
      }),
    ],
  });

const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 32, color: "1B2B4B" })],
  });

const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 26, color: "1B2B4B" })],
  });

const h3 = (text) =>
  new Paragraph({
    spacing: { before: 160, after: 80 },
    children: [new TextRun({ text, bold: true, size: 24, color: "334155" })],
  });

const p = (text, opts = {}) =>
  new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text,
        size: 22,
        bold: opts.bold || false,
        italics: opts.italics || false,
      }),
    ],
  });

const bullet = (text) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 22 })],
  });

const cell = (text, opts = {}) =>
  new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.header
      ? { fill: "E8ECF4", type: ShadingType.CLEAR }
      : undefined,
    children: [
      new Paragraph({
        children: [
          new TextRun({ text, bold: !!opts.header, size: 22 }),
        ],
      }),
    ],
  });

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
        },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: "LOGISTICS MANAGEMENT PORTAL",
              bold: true,
              size: 40,
              color: "1B2B4B",
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [
            new TextRun({
              text: "PROJECT PROPOSAL & QUOTATION",
              bold: true,
              size: 28,
              color: "475569",
            }),
          ],
        }),

        p("Prepared For: [Client Company Name]"),
        p("Prepared By: Om Sairaj Rout"),
        p("Date: 13/09/2026"),
        p("Quotation Valid Until: 13/10/2026 (30 days)"),
        p("Reference No.: QUO-2026-001"),

        hr(),

        h1("1. Executive Summary"),
        p(
          "This document outlines the scope, deliverables, pricing, and payment terms for the development and customization of a Custom Logistics & Shipment Management Web Portal for the client."
        ),
        p(
          "The solution is a production-grade logistics operations platform (built on a proven base system similar to AAYSH Express) covering order lifecycle management, AWB assignment, document generation, pickup operations, analytics, customer tracking, and support ticketing. Using an established base enables faster delivery and cost-effective implementation compared to building from scratch."
        ),

        hr(),

        h1("2. Project Overview"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                cell("Project Name", { header: true, width: 30 }),
                cell("Custom Logistics & Shipment Management Portal", { width: 70 }),
              ],
            }),
            new TableRow({
              children: [
                cell("Project Type", { header: true }),
                cell(
                  "Web Application — Admin Portal, Company User Portal & Public Tracking"
                ),
              ],
            }),
            new TableRow({
              children: [
                cell("Technology", { header: true }),
                cell(
                  "React (frontend), Node.js & Express (backend), MongoDB (database)"
                ),
              ],
            }),
            new TableRow({
              children: [
                cell("Delivery", { header: true }),
                cell("Responsive web application (desktop & mobile browsers)"),
              ],
            }),
          ],
        }),
        h3("Objective"),
        p("To provide the client with a centralized platform to:"),
        bullet("Manage customer orders and shipments end-to-end"),
        bullet("Upload and process orders in bulk via Excel"),
        bullet("Assign AWB numbers and generate shipping documents (labels, invoices, manifests)"),
        bullet("Manage forward and reverse pickup operations with scheduling"),
        bullet("Monitor business performance through dashboards and reports"),
        bullet("Allow end customers to track shipments online by AWB"),
        bullet("Handle support requests through an integrated ticketing system"),
        bullet("Manage company teams with role-based access control"),

        hr(),

        h1("3. Full Portal — Scope & Pricing"),
        p("Complete Logistics Operations System (Recommended)", { bold: true }),
        p(
          "Ideal for businesses that require a complete end-to-end logistics operations platform aligned with real courier workflows."
        ),

        h3("Authentication & User Management"),
        bullet("User login, logout, forgot password & reset password"),
        bullet("Platform admin and company user roles"),
        bullet("Company-based multi-user access"),
        bullet("Role-based permissions (read/write per module)"),
        bullet("Company team management (owner, manager, operator, viewer)"),
        bullet("User registration overview and account management (admin)"),

        h3("Order Management"),
        bullet("Manual order creation with line items, weights & documents"),
        bullet("Bulk order upload via Excel with upload history"),
        bullet("Order listing with search, filters and pagination"),
        bullet("Order view, edit, update and cancellation"),
        bullet("Delivery address and pickup location updates"),
        bullet("Order document upload (invoice, e-way bill, delivery challan)"),
        bullet("Product catalog integration for faster order entry"),

        h3("AWB & Courier Management"),
        bullet("AWB pool management and sheet upload"),
        bullet("AWB assignment to orders (with courier priority rules)"),
        bullet("Courier management"),
        bullet("Pincode serviceability management"),
        bullet("Courier priority configuration (surface / air / prime)"),

        h3("Document Generation"),
        bullet("Shipping label PDF with barcode"),
        bullet("Invoice PDF generation"),
        bullet("Manifest PDF generation"),
        bullet("Branded documents with company logo"),

        h3("Pickup Management"),
        bullet("User pickup requests and admin pickup panel"),
        bullet("Pickup scheduling, reschedule, cancel and complete workflows"),

        h3("Reverse Pickup"),
        bullet("Reverse pickup request creation"),
        bullet("Admin approval / rejection workflow"),
        bullet("Reverse pickup tracking and document management"),

        h3("Tracking System"),
        bullet("Internal shipment tracking by AWB / order"),
        bullet("Public customer tracking page"),
        bullet("Tracking status updates and delivery attempt history"),

        h3("Dashboard & Reports"),
        bullet("Business analytics dashboard (orders, revenue, zones, status)"),
        bullet("Order reports by date"),
        bullet("Excel export and report downloads"),
        bullet("Bulk order status update via Excel"),

        h3("Support System"),
        bullet("Support ticket creation with attachments"),
        bullet("Ticket conversation thread (user & admin)"),
        bullet("Admin ticket management panel with unread indicators"),

        h3("Public Website"),
        bullet("Professional landing / home page"),
        bullet("Shipment tracking from homepage"),
        bullet("Contact / inquiry section"),

        h3("Deployment & Support"),
        bullet("Server and application deployment assistance"),
        bullet("Database setup and basic configuration"),
        bullet("30 days post-launch bug-fix warranty"),

        h3("Project Cost"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                cell("Description", { header: true, width: 50 }),
                cell("Amount (INR)", { header: true, width: 50 }),
              ],
            }),
            new TableRow({
              children: [
                cell("Full Portal — Total Project Cost"),
                cell("₹1,00,000 (Rupees One Lakh Only)"),
              ],
            }),
          ],
        }),

        h3("Payment Terms"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                cell("Payment", { header: true, width: 35 }),
                cell("When Due", { header: true, width: 35 }),
                cell("Amount", { header: true, width: 30 }),
              ],
            }),
            new TableRow({
              children: [
                cell("Advance"),
                cell("On project commencement"),
                cell("₹30,000 (30%)"),
              ],
            }),
            new TableRow({
              children: [
                cell("Completion"),
                cell("On final delivery & handover"),
                cell("₹70,000 (70%)"),
              ],
            }),
            new TableRow({
              children: [
                cell("Total", { header: true }),
                cell("", { header: true }),
                cell("₹1,00,000", { header: true }),
              ],
            }),
          ],
        }),
        p("Timeline: 6–8 weeks from receipt of advance payment"),

        hr(),

        h1("4. Optional Add-On Services"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                cell("Service", { header: true, width: 60 }),
                cell("Price (INR)", { header: true, width: 40 }),
              ],
            }),
            new TableRow({
              children: [
                cell("Monthly maintenance & support (bug fixes, minor updates)"),
                cell("₹6,000 / month"),
              ],
            }),
            new TableRow({
              children: [
                cell("Third-party courier API integration (per courier)"),
                cell("₹10,000 – ₹20,000"),
              ],
            }),
            new TableRow({
              children: [
                cell("Additional custom feature development"),
                cell("₹5,000 – ₹15,000 per feature (quoted before work)"),
              ],
            }),
          ],
        }),

        hr(),

        h1("5. Costs Borne by Client"),
        p(
          "The following are not included in the project quotation and shall be paid directly by the client: domain, hosting (frontend & backend), database hosting, file storage (e.g. AWS S3), email service, and SSL / other third-party charges."
        ),

        hr(),

        h1("6. Payment Terms"),
        bullet("Work commences only after receipt of advance payment."),
        bullet("Payment mode: Bank Transfer / UPI"),
        bullet(
          "Completion payment is due upon final delivery, testing, and handover of the agreed scope."
        ),
        bullet(
          "Advance payment is non-refundable once development work has commenced."
        ),
        bullet(
          "Development may be paused if completion payment is delayed beyond 7 days of delivery."
        ),
        h3("Payment Details"),
        p("Account Name: [Your Name / Business Name]"),
        p("Bank Name: [Bank Name]"),
        p("Account Number: [XXXXXXXXXXXX]"),
        p("IFSC Code: [XXXXXXXXX]"),
        p("UPI ID: [yourname@upi]"),

        hr(),

        h1("7. Client Responsibilities"),
        bullet("Company logo, branding assets, and company details"),
        bullet("Timely feedback on progress (within 3–5 business days)"),
        bullet("Payment as per agreed schedule"),
        bullet("One designated point of contact for project communication"),

        hr(),

        h1("8. Scope Change Policy"),
        bullet(
          "Any feature not listed in the agreed scope is treated as a change request."
        ),
        bullet(
          "Change requests will be quoted separately before implementation."
        ),
        bullet("Timeline may be revised for approved change requests."),

        hr(),

        h1("9. Warranty & Support"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                cell("Warranty Period", { header: true, width: 50 }),
                cell("Coverage", { header: true, width: 50 }),
              ],
            }),
            new TableRow({
              children: [
                cell("30 days from go-live"),
                cell("Bug fixes only (no new features)"),
              ],
            }),
          ],
        }),
        p(
          "Warranty does not cover new feature requests, hosting issues, third-party API failures, or issues after the warranty period. Post-warranty support is available under the optional monthly maintenance plan (₹6,000/month)."
        ),

        hr(),

        h1("10. Intellectual Property"),
        p(
          "Upon full and final payment, the client receives full rights to use the deployed, customized portal for their business. Source code transfer can be provided upon final payment if mutually agreed."
        ),

        hr(),

        h1("11. Acceptance & Sign-Off"),
        p("Selected Package:"),
        p("[ ] Full Portal — ₹1,00,000"),
        p("Optional Add-Ons:"),
        p("[ ] Monthly Maintenance — ₹6,000/month"),
        p("[ ] Courier API Integration — ₹___________"),
        p("[ ] Other: _________________________ — ₹___________"),
        p("Total Agreed Amount: ₹_________________"),
        p(""),
        p("Client Name: _________________________________"),
        p("Designation: _________________________________"),
        p("Company: _________________________________"),
        p("Signature: _________________________________"),
        p("Date: _________________________________"),
        p(""),
        p("Developer Name: Om Sairaj Rout"),
        p("Signature: _________________________________"),
        p("Date: _________________________________"),

        hr(),

        h1("Contact"),
        p("Om Sairaj Rout"),
        p("Phone: +91 9319670744"),
        p("Email: omsairajraut@gmail.com"),
        p(""),
        p("*This document is confidential and intended solely for the named client.*", {
          italics: true,
        }),
      ],
    },
  ],
});

const outPath =
  "c:\\Users\\dell\\Downloads\\Logistics_Management_Portal_Proposal_Quotation_Polished.docx";
const altPath =
  "d:\\Projects\\AAYSH\\docs\\Logistics_Management_Portal_Proposal_Quotation_Polished.docx";

Packer.toBuffer(doc).then((buffer) => {
  try {
    fs.writeFileSync(outPath, buffer);
    console.log("Written:", outPath);
  } catch (e) {
    console.warn("Could not write to Downloads (file may be open):", e.message);
    fs.mkdirSync(path.dirname(altPath), { recursive: true });
    fs.writeFileSync(altPath, buffer);
    console.log("Written:", altPath);
  }
});

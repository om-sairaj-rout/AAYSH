import * as XLSX from 'xlsx';
import { Download, FileSpreadsheet } from 'lucide-react';

const TemplatePage = () => {
  const handleDownloadTemplate = () => {
    const templateData = [
  {
    "Order ID": "CLIENT-ORDER-10011",
    "Order Date": "2026-07-28",

    "Pickup Location": "Primary",

    "Consignor Name": "XYZ COMPANY",

    "Customer Name": "Rahul",
    "Customer Last Name": "Sharma",

    "Address": "Sector 62",
    "Address 2": "Near Metro Station",

    "City": "Noida",
    "State": "Uttar Pradesh",
    "Pincode": "201309",
    "Country": "India",

    "Email": "rahul@example.com",
    "Phone": "9876543210",
    "Alternate Phone": "9876543211",


    "Payment Method": "COD",

    "Comment": "Deliver before 6 PM",

    "Product Name": "Wireless Headphones",
    "SKU": "WH-001",
    "Units": 1,
    "Selling Price": 1499,
    "Discount": 100,
    "Tax": 18,
    "HSN": "8518",

    "Shipping Charges": 50,
    "Giftwrap Charges": 0,
    "Transaction Charges": 0,
    "Total Discount": 100,
    "Invoice No": "INV-CLIENT-10011",
    "Invoice Value": 1448,

    "Weight": 0.5,
    "No. of Boxes": 1,
    "Length": 20,
    "Breadth": 15,
    "Height": 10
  }
];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders Template");

    XLSX.writeFile(workbook, "Order_Manifest_Template.xlsx");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans text-slate-700 space-y-8">
      <div className="max-w-5xl mx-auto w-full bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100/80 overflow-hidden">
        
        {/* Header section matching your dashboard style */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h1 className="text-xl font-bold text-[#1E293B] tracking-wide uppercase">
            Download Excel Template
          </h1>
        </div>

        {/* Inner Content Area */}
        <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
          
          {/* Left Side: File Visualizer & Instructions */}
          <div className="flex items-center gap-5 flex-1">
            <div className="w-16 h-16 bg-[#FFF7ED] rounded-2xl flex items-center justify-center border border-[#FFEDD5] shrink-0">
              {/* Custom styled icon matching your orange manifest icon */}
              <FileSpreadsheet className="w-8 h-8 text-[#F97316]" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Standard Order Manifest</h3>
              <p className="text-sm text-slate-400 mt-1">
                Download our standardized <span className="font-medium text-slate-500">.xlsx</span> layout. Fill in your order entries matching this format to ensure error-free automated uploads.
              </p>
            </div>
          </div>

          {/* Right Side: Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl font-semibold transition-all text-sm uppercase tracking-wider"
            >
              Back to Upload
            </button>
            
            <button
              onClick={handleDownloadTemplate}
              className="px-6 py-3 bg-[#1E293B] hover:bg-[#0F172A] text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 uppercase text-sm tracking-wider"
            >
              <Download className="w-4 h-4" />
              Download Template
            </button>
          </div>

        </div>

        {/* Footer/Note section */}
        <div className="bg-[#F8FAFC] px-8 py-4 border-t border-gray-100 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]"></span>
          <p className="text-xs text-slate-500">
            Do not modify or rename the column headers in the template file, as doing so will cause validation errors during processing.
          </p>
        </div>

      </div>
    </div>
  );
};

export default TemplatePage;
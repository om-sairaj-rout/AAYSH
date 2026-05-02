import {ChevronsUpDown } from "lucide-react";

const BookingInfo = () => {
  const tableData = [
    {
      id: 1,
      seller: { name: "Test (SoftTech)", email: "test@gmail.com", phone: "9510680663" },
      order: { lrNo: "#00091", courier: "Delhivery Surface 5 Kg", awb: "#51713110015676" },
      customer: { name: "jalpa patel", email: "jalpa.softieons@gmail.com", phone: "1234567890" },
      address: "varacha",
      city: "Surat",
      state: "Gujarat"
    },
    {
      id: 2,
      seller: { name: "Test (SoftTech)", email: "test@gmail.com", phone: "9510680663" },
      order: { lrNo: "#00090", courier: "Delhivery Surface 5 Kg", awb: "#51713110015665" },
      customer: { name: "jalpa patel", email: "jalpa.softieons@gmail.com", phone: "1234567890" },
      address: "varacha",
      city: "Surat",
      state: "Gujarat"
    }
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* --- FILTER SECTION --- */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end border-b border-gray-200 pb-6">
        {/* <div className="space-y-1">
          <label className="text-sm font-semibold text-red-700">User</label>
          <div className="relative">
            <select className="w-full p-2 border border-gray-300 rounded-md appearance-none bg-white pr-8 outline-none focus:ring-1 focus:ring-blue-500">
              <option>All Users</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold text-red-700">Courier Name</label>
          <div className="relative">
            <select className="w-full p-2 border border-gray-300 rounded-md appearance-none bg-white pr-8 outline-none">
              <option>Select Courier ...</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          </div>
        </div> */}

        <div className="space-y-1">
          <label className="text-sm font-semibold text-red-700">From Date</label>
          <input type="date" defaultValue="2026-05-01" className="w-full p-2 border border-gray-300 rounded-md outline-none" />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold text-red-700">To Date</label>
          <input type="date" defaultValue="2026-05-31" className="w-full p-2 border border-gray-300 rounded-md outline-none" />
        </div>

        <button className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-6 rounded-lg transition-colors">
          Search
        </button>
      </div>

      {/* --- SEARCH & EXPORT SECTION --- */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-gray-700">Show</span>
          <select className="border border-gray-300 rounded px-2 py-1">
            <option>25</option>
          </select>
          <span className="text-gray-700">entries</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search" 
              className="border border-gray-300 rounded-md py-2 px-4 w-64 md:w-80 outline-none focus:border-blue-500"
            />
          </div>
          <button className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
            XLXS
          </button>
        </div>
      </div>

      {/* --- TABLE SECTION --- */}
      <div className="overflow-x-auto border border-gray-100 rounded-lg">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              {["Sr.No", "Seller Details", "Order Details", "Customer Details", "Address", "City", "State"].map((header) => (
                <th key={header} className="p-4 font-semibold text-gray-600">
                  <div className="flex items-center gap-2 cursor-pointer hover:text-gray-900">
                    {header} <ChevronsUpDown size={14} className="text-gray-300" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tableData.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 text-gray-500">{row.id}</td>
                <td className="p-4 leading-relaxed">
                  <p className="font-medium text-gray-800">{row.seller.name}</p>
                  <p className="text-gray-500">{row.seller.email}</p>
                  <p className="text-gray-500">{row.seller.phone}</p>
                </td>
                <td className="p-4 leading-relaxed">
                  <p className="text-gray-600 font-medium">Order Prefix/LR No: <span className="text-blue-600 cursor-pointer">{row.order.lrNo}</span></p>
                  <p className="text-gray-500 font-medium">Courier: {row.order.courier}</p>
                  <p className="text-gray-600 font-medium">AWB Number: <span className="text-blue-600 cursor-pointer">{row.order.awb}</span></p>
                  <p className="text-blue-600 underline text-xs mt-1 cursor-pointer">View Products</p>
                </td>
                <td className="p-4 leading-relaxed">
                  <p className="font-medium text-gray-800">{row.customer.name}</p>
                  <p className="text-gray-500">{row.customer.email}</p>
                  <p className="text-gray-500">{row.customer.phone}</p>
                </td>
                <td className="p-4 text-gray-600">{row.address}</td>
                <td className="p-4 text-gray-600">{row.city}</td>
                <td className="p-4 text-gray-600">{row.state}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- PAGINATION SECTION --- */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm font-semibold text-gray-800">Showing 1 to 2 of 2 entries</p>
        <div className="flex items-center gap-0 border rounded overflow-hidden">
          <button className="px-3 py-1 text-sm font-medium hover:bg-gray-100 text-gray-600">Previous</button>
          <button className="px-3 py-1 text-sm font-medium bg-gray-900 text-white">1</button>
          <button className="px-3 py-1 text-sm font-medium hover:bg-gray-100 text-gray-600">Next</button>
        </div>
      </div>
    </div>
  );
};

export default BookingInfo;
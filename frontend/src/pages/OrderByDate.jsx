import { ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { getOrdersByDate } from "../api/ordersAPI";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";

const OrderByDateInfo = () => {
  const [tableData, setTableData] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(25);

  const { isAdmin, user } = useSelector((state) => state.auth);
  const canSeeWeight = isAdmin || user?.showWeight;

  const adminOnlyFields = [
    "weight",
    "category",
    "expectedHours",
    "actualHours",
    "ageing",
  ];

  const handleSearch = async () => {
    try {
      if (!fromDate || !toDate) {
        toast.error("Please select both dates");
        return;
      }

      let formattedFrom = fromDate;
      let formattedTo = toDate;

      if (fromDate.includes("/")) {
        const [fDay, fMonth, fYear] = fromDate.split("/");
        formattedFrom = `${fYear}-${fMonth}-${fDay}`;
      }
      if (toDate.includes("/")) {
        const [tDay, tMonth, tYear] = toDate.split("/");
        formattedTo = `${tYear}-${tMonth}-${tDay}`;
      }

      if (new Date(formattedFrom) > new Date(formattedTo)) {
        toast.error("From date cannot be greater than To date");
        return;
      }

      setLoading(true);

      const result = await getOrdersByDate(fromDate, toDate);

      if (result.success) {
        // ✅ SORT ASCENDING BY PICKUP DATE
        const sortedData = (result.orders || []).sort((a, b) => {
          return new Date(a.pickupDate) - new Date(b.pickupDate);
        });

        setTableData(sortedData);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (tableData.length === 0) {
      toast.error("No data to export");
      return;
    }

    const cleanedData = tableData.map((row) => {
      const newRow = {};

      Object.entries(row)
        .filter(([key]) => {
          if (
            [
              "_id",
              "__v",
              "historyId",
              "uploadedBy",
              "createdAt",
              "updatedAt",
            ].includes(key)
          )
            return false;

          if (key === "weight" && !canSeeWeight) return false;
          if (!isAdmin && adminOnlyFields.includes(key) && key !== "weight") return false;

          return true;
        })
        .forEach(([key, value]) => {
          if (
            typeof value === "string" &&
            value.includes("T") &&
            value.includes("Z")
          ) {
            const date = new Date(value);
            const day = String(date.getDate()).padStart(2, "0");
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const year = date.getFullYear();
            newRow[key] = `${day}-${month}-${year}`;
          } else {
            newRow[key] = value ?? "N/A";
          }
        });

      return newRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(cleanedData);

    // ================= EXCEL STYLING (BOLD HEADERS & THIN BORDERS) =================
    if (worksheet["!ref"]) {
      const range = XLSX.utils.decode_range(worksheet["!ref"]);

      const thinBorder = {
        top: { style: "thin", color: { rgb: "A6A6A6" } },
        bottom: { style: "thin", color: { rgb: "A6A6A6" } },
        left: { style: "thin", color: { rgb: "A6A6A6" } },
        right: { style: "thin", color: { rgb: "A6A6A6" } },
      };

      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!worksheet[cellAddress]) continue;

          worksheet[cellAddress].s = worksheet[cellAddress].s || {};
          
          // Apply thin border to all exported data cells
          worksheet[cellAddress].s.border = thinBorder;

          // Header Row (Row 0): Bold Text + Light Background Fill + Left Alignment
          if (R === 0) {
            worksheet[cellAddress].s.font = { bold: true, color: { rgb: "000000" }, name: "Calibri", sz: 11 };
            worksheet[cellAddress].s.fill = { fgColor: { rgb: "E5E7EB" } };
            worksheet[cellAddress].s.alignment = { vertical: "center", horizontal: "left" };
          }
        }
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
      cellStyles: true,
    });

    const fileData = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(fileData, `orders_${fromDate}_to_${toDate}.xlsx`);
  };

  const indexOfLastRow = currentPage * entriesPerPage;
  const indexOfFirstRow = indexOfLastRow - entriesPerPage;
  const currentRows = tableData.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(tableData.length / entriesPerPage);

  const getVisibleKeys = () => {
    if (tableData.length === 0) return [];

    return Object.keys(tableData[0]).filter((key) => {
      if (
        [
          "_id",
          "__v",
          "historyId",
          "uploadedBy",
          "createdAt",
          "updatedAt",
        ].includes(key)
      )
        return false;

      if (key === "weight" && !canSeeWeight) return false;
      if (!isAdmin && adminOnlyFields.includes(key) && key !== "weight") return false;

      return true;
    });
  };

  const visibleKeys = getVisibleKeys();

  return (
    <div className="flex flex-col gap-8">

      {/* FILTER SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end border-b border-gray-200 pb-6">

        <div className="space-y-1">
          <label className="text-sm font-semibold text-red-700">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold text-red-700">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md outline-none"
          />
        </div>

        <button
          onClick={handleSearch}
          className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-6 rounded-lg transition-colors"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {/* TOP CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-4">

        <div className="flex items-center gap-2">
          <span className="text-gray-700">Show</span>

          <select
            value={entriesPerPage}
            onChange={(e) => {
              setEntriesPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded px-2 py-1"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>

          <span className="text-gray-700">entries</span>
        </div>

        <div className="flex items-center gap-3">

          <button
            onClick={handleExport}
            className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
          >
            XLSX
          </button>

        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">

        <table className="w-full text-left text-sm border-collapse">

          <thead>
            <tr className="border-t border-b border-gray-300 bg-gray-100/80">

              {visibleKeys.map((header) => (
                <th
                  key={header}
                  className="p-4 font-bold text-gray-800 whitespace-nowrap border-r border-gray-200 last:border-r-0"
                >
                  <div className="flex items-center gap-2">
                    {header}
                    <ChevronsUpDown size={14} className="text-gray-400" />
                  </div>
                </th>
              ))}

            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">

            {currentRows.length > 0 ? (
              currentRows.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">

                  {visibleKeys.map((key, i) => (
                    <td
                      key={`${key}-${i}`}
                      className="p-4 text-gray-600 whitespace-nowrap"
                    >
                      {(() => {
                        const value = row[key];

                        if (!value) return "N/A";

                        if (
                          typeof value === "string" &&
                          value.includes("T") &&
                          value.includes("Z")
                        ) {
                          const date = new Date(value);
                          const day = String(date.getDate()).padStart(2, "0");
                          const month = String(date.getMonth() + 1).padStart(2, "0");
                          const year = date.getFullYear();
                          return `${day}-${month}-${year}`;
                        }

                        return String(value);
                      })()}
                    </td>
                  ))}

                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="100%" className="text-center py-10 text-gray-400">
                  No Data Found
                </td>
              </tr>
            )}

          </tbody>

        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-between mt-4">

        <p className="text-sm font-semibold text-gray-800">
          Showing {indexOfFirstRow + 1} to{" "}
          {Math.min(indexOfLastRow, tableData.length)} of{" "}
          {tableData.length} entries
        </p>

        <div className="flex items-center gap-2">

          <button
            onClick={() => setCurrentPage((prev) => prev - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm font-medium border rounded disabled:opacity-50"
          >
            Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 text-sm font-medium border rounded ${
                currentPage === page ? "bg-black text-white" : ""
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage((prev) => prev + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm font-medium border rounded disabled:opacity-50"
          >
            Next
          </button>

        </div>
      </div>

    </div>
  );
};

export default OrderByDateInfo;
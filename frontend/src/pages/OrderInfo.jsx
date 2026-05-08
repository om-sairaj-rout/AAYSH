import { ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { getOrdersByDate } from "../api/ordersAPI";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const BookingInfo = () => {

  const [tableData, setTableData] = useState([]);

  const [fromDate, setFromDate] = useState("");

  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(false);

  // PAGINATION STATES
  const [currentPage, setCurrentPage] = useState(1);

  const [entriesPerPage, setEntriesPerPage] = useState(25);

  const handleSearch = async () => {

    try {

      if (!fromDate || !toDate) {
        alert("Please select both dates");
        return;
      }

      setLoading(true);

      const result = await getOrdersByDate(
        fromDate,
        toDate
      );

      if (result.success) {
        setTableData(result.orders || []);
        setCurrentPage(1); // RESET PAGE
      }

    } catch (error) {

      console.error(error);

    } finally {

      setLoading(false);

    }
  };

  // EXPORT FUNCTION
  const handleExport = () => {

    if (tableData.length === 0) {
      alert("No data to export");
      return;
    }

    const cleanedData = tableData.map((row) => {

      const newRow = {};

      Object.entries(row)

        .filter(
          ([key]) =>
            ![
              "_id",
              "__v",
              "historyId",
              "uploadedBy",
              "createdAt",
              "updatedAt"
            ].includes(key)
        )

        .forEach(([key, value]) => {

          // Format dates
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

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Orders"
    );

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array"
    });

    const fileData = new Blob(
      [excelBuffer],
      {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }
    );

    saveAs(
      fileData,
      `orders_${fromDate}_to_${toDate}.xlsx`
    );
  };

  // PAGINATION LOGIC
  const indexOfLastRow = currentPage * entriesPerPage;

  const indexOfFirstRow = indexOfLastRow - entriesPerPage;

  const currentRows = tableData.slice(
    indexOfFirstRow,
    indexOfLastRow
  );

  const totalPages = Math.ceil(
    tableData.length / entriesPerPage
  );

  return (
    <div className="flex flex-col gap-8">

      {/* --- FILTER SECTION --- */}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end border-b border-gray-200 pb-6">

        <div className="space-y-1">
          <label className="text-sm font-semibold text-red-700">
            From Date
          </label>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold text-red-700">
            To Date
          </label>

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

      {/* --- SEARCH & EXPORT SECTION --- */}

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

          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              className="border border-gray-300 rounded-md py-2 px-4 w-64 md:w-80 outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={handleExport}
            className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
          >
            XLXS
          </button>

        </div>
      </div>

      {/* --- TABLE SECTION --- */}

      <div className="overflow-x-auto border border-gray-100 rounded-lg">

        <table className="w-full text-left text-sm border-collapse">

          <thead>

            <tr className="border-b border-gray-200 bg-gray-50">

              {tableData.length > 0 &&

                Object.keys(tableData[0])

                  .filter(
                    (key) =>
                      ![
                        "_id",
                        "__v",
                        "historyId",
                        "uploadedBy",
                        "createdAt",
                        "updatedAt"
                      ].includes(key)
                  )

                  .map((header) => (

                    <th
                      key={header}
                      className="p-4 font-semibold text-gray-600 whitespace-nowrap"
                    >

                      <div className="flex items-center gap-2">

                        {header}

                        <ChevronsUpDown
                          size={14}
                          className="text-gray-300"
                        />

                      </div>

                    </th>

                  ))}

            </tr>

          </thead>

          <tbody className="divide-y divide-gray-100">

            {currentRows.length > 0 ? (

              currentRows.map((row, index) => (

                <tr
                  key={index}
                  className="hover:bg-gray-50 transition-colors"
                >

                  {Object.entries(row)

                    .filter(
                      ([key]) =>
                        ![
                          "_id",
                          "__v",
                          "historyId",
                          "uploadedBy",
                          "createdAt",
                          "updatedAt"
                        ].includes(key)
                    )

                    .map(([columnKey, value], i) => (

                      <td
                        key={`${columnKey}-${i}`}
                        className="p-4 text-gray-600 whitespace-nowrap"
                      >

                        {(() => {

                          if (
                            value === null ||
                            value === undefined ||
                            value === ""
                          ) {
                            return "N/A";
                          }

                          // FORMAT DATE
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

                <td
                  colSpan="100%"
                  className="text-center py-10 text-gray-400"
                >
                  No Data Found
                </td>

              </tr>

            )}

          </tbody>

        </table>

      </div>

      {/* --- PAGINATION SECTION --- */}

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
            className={`px-3 py-1 text-sm font-medium border rounded ${
              currentPage === 1
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (

            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 text-sm font-medium border rounded ${
                currentPage === page
                  ? "bg-gray-900 text-white"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
            >
              {page}
            </button>

          ))}

          <button
            onClick={() => setCurrentPage((prev) => prev + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            className={`px-3 py-1 text-sm font-medium border rounded ${
              currentPage === totalPages || totalPages === 0
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            Next
          </button>

        </div>
      </div>
    </div>
  );
};

export default BookingInfo;
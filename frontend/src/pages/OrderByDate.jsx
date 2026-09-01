import { ChevronsUpDown } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { getOrdersByDate } from "../api/ordersAPI";
import { getCompanies } from "../api/companyAPI";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { toast } from '../utils/toast';
import { formatDisplayDate } from "../utils/dateTime";
import { hasGlobalDataAccess } from "../utils/permissions";

const HIDDEN_TABLE_KEYS = new Set([
  "_id",
  "__v",
  "historyId",
  "uploadedBy",
  "createdAt",
  "updatedAt",
  "delivery_attempt_list",
  "attempt_failure_reason",
  "delivery_attempts",
]);

const SHIPPING_DETAIL_KEYS = ["awb_number", "courier_name", "service_type"];

const COLUMN_LABELS = {
  awb_number: "AWB Number",
  courier_name: "Courier Name",
  service_type: "Service Type",
};

const formatColumnLabel = (key) => COLUMN_LABELS[key] || key;

const formatAttemptStatus = (attempt) => {
  if (!attempt) {
    return "—";
  }

  if (attempt.outcome === "Failed") {
    return `Failed - ${attempt.failure_reason || "No reason provided"}`;
  }

  if (attempt.outcome === "Delivered") {
    return "Delivered";
  }

  if (attempt.outcome === "In Progress") {
    return "In Progress";
  }

  return attempt.outcome || "—";
};

const getAttemptByNumber = (attempts = [], attemptNumber) =>
  attempts.find((attempt) => attempt.attempt_number === attemptNumber) || null;

const OrderByDateInfo = () => {
  const [tableData, setTableData] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });
  const [selectedCompany, setSelectedCompany] = useState("ALL");
  const [companiesList, setCompaniesList] = useState([]);

  const { user } = useSelector((state) => state.auth);
  const hasGlobalAccess = hasGlobalDataAccess(user);
  const canSeeWeight = hasGlobalAccess || user?.showWeight;

  const adminOnlyFields = [
    "weight",
    "category",
    "expectedHours",
    "actualHours",
    "ageing",
  ];

  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (!hasGlobalAccess) return;
    getCompanies()
      .then((res) => {
        if (res.success && Array.isArray(res.companies)) {
          setCompaniesList(res.companies);
        }
      })
      .catch(() => {});
  }, [hasGlobalAccess]);

  const loadOrders = async (page = currentPage) => {
    if (!fromDate || !toDate) {
      toast.validation("Please select both dates");
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
      toast.validation("From date cannot be greater than To date");
      return;
    }

    try {
      setLoading(true);

      const result = await getOrdersByDate(formattedFrom, formattedTo, {
        page,
        perPage: entriesPerPage,
        companyId: hasGlobalAccess ? selectedCompany : undefined,
      });

      if (result.success) {
        setTableData(result.orders || []);
        setPagination(result.meta?.pagination || { total: 0, total_pages: 1 });
        setHasFetched(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setCurrentPage(1);
    await loadOrders(1);
  };

  useEffect(() => {
    if (hasFetched) {
      loadOrders();
    }
  }, [currentPage, entriesPerPage, selectedCompany]);

  const getVisibleKeysForRow = (sampleRow) => {
    if (!sampleRow) return [];

    const keys = Object.keys(sampleRow).filter((key) => {
      if (HIDDEN_TABLE_KEYS.has(key)) return false;

      if (key === "weight" && !canSeeWeight) return false;
      if (!hasGlobalAccess && adminOnlyFields.includes(key) && key !== "weight") return false;

      return true;
    });

    const withoutShippingDetails = keys.filter(
      (key) => !SHIPPING_DETAIL_KEYS.includes(key)
    );
    const shippingDetails = SHIPPING_DETAIL_KEYS.filter((key) => keys.includes(key));
    const statusIndex = withoutShippingDetails.indexOf("status");

    if (statusIndex === -1) {
      return [...withoutShippingDetails, ...shippingDetails];
    }

    return [
      ...withoutShippingDetails.slice(0, statusIndex + 1),
      ...shippingDetails,
      ...withoutShippingDetails.slice(statusIndex + 1),
    ];
  };

  const getVisibleKeys = () => getVisibleKeysForRow(tableData[0]);

  const visibleKeys = getVisibleKeys();
  const currentRows = tableData;

  const maxAttemptColumns = useMemo(() => {
    if (!currentRows.length) return 0;

    return currentRows.reduce((max, row) => {
      const total = Number(row.delivery_attempts || 0);
      const listLength = row.delivery_attempt_list?.length || 0;
      return Math.max(max, total, listLength);
    }, 0);
  }, [currentRows]);

  const attemptColumnNumbers = useMemo(
    () => Array.from({ length: maxAttemptColumns }, (_, index) => index + 1),
    [maxAttemptColumns]
  );

  const renderCellValue = (value) => {
    if (value === undefined || value === null || value === "") {
      return "N/A";
    }

    if (
      typeof value === "string" &&
      (value.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(value))
    ) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return formatDisplayDate(parsed);
      }
    }

    return String(value);
  };

  const buildExportRow = (row) => {
    const newRow = {};

    visibleKeys.forEach((key) => {
      newRow[formatColumnLabel(key)] = renderCellValue(row[key]);
    });

    newRow.DeliveryAttempts = Number(row.delivery_attempts || 0);

    attemptColumnNumbers.forEach((attemptNumber) => {
      const attempt = getAttemptByNumber(
        row.delivery_attempt_list || [],
        attemptNumber
      );
      newRow[`Attempt ${attemptNumber}`] = formatAttemptStatus(attempt);
    });

    return newRow;
  };

  const handleExport = async () => {
    if (!fromDate || !toDate) {
      toast.validation("Please select both dates");
      return;
    }

    try {
      setLoading(true);

      const result = await getOrdersByDate(fromDate, toDate, {
        all: true,
        companyId: hasGlobalAccess ? selectedCompany : undefined,
      });

      if (!result.success || !result.orders?.length) {
        toast.error("No data to export");
        return;
      }

      const exportMaxAttempts = result.orders.reduce((max, row) => {
        const total = Number(row.delivery_attempts || 0);
        const listLength = row.delivery_attempt_list?.length || 0;
        return Math.max(max, total, listLength);
      }, 0);

      const exportAttemptNumbers = Array.from(
        { length: exportMaxAttempts },
        (_, index) => index + 1
      );

      const exportVisibleKeys = getVisibleKeysForRow(result.orders[0]);

      const cleanedData = result.orders.map((row) => {
        const newRow = {};

        exportVisibleKeys.forEach((key) => {
          newRow[formatColumnLabel(key)] = renderCellValue(row[key]);
        });

        newRow.DeliveryAttempts = Number(row.delivery_attempts || 0);

        exportAttemptNumbers.forEach((attemptNumber) => {
          const attempt = getAttemptByNumber(
            row.delivery_attempt_list || [],
            attemptNumber
          );
          newRow[`Attempt ${attemptNumber}`] = formatAttemptStatus(attempt);
        });

        return newRow;
      });

      const worksheet = XLSX.utils.json_to_sheet(cleanedData);

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
            worksheet[cellAddress].s.border = thinBorder;

            if (R === 0) {
              worksheet[cellAddress].s.font = {
                bold: true,
                color: { rgb: "000000" },
                name: "Calibri",
                sz: 11,
              };
              worksheet[cellAddress].s.fill = { fgColor: { rgb: "E5E7EB" } };
              worksheet[cellAddress].s.alignment = {
                vertical: "center",
                horizontal: "left",
              };
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
    } catch (error) {
      console.error(error);
      toast.error("Failed to export data");
    } finally {
      setLoading(false);
    }
  };

  const totalRows = pagination.total || 0;
  const totalPages = pagination.total_pages || 1;
  const indexOfFirstRow = totalRows === 0 ? 0 : (currentPage - 1) * entriesPerPage;
  const indexOfLastRow = Math.min(currentPage * entriesPerPage, totalRows);

  return (
    <div className="flex flex-col gap-8">
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

        {hasGlobalAccess && (
          <div className="space-y-1">
            <label className="text-sm font-semibold text-red-700">Company</label>
            <select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-2 border border-gray-300 rounded-md outline-none bg-white"
            >
              <option value="ALL">All Companies</option>
              {companiesList.map((company) => (
                <option key={company.companyID} value={company.companyID}>
                  {company.companyName} ({company.companyID})
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={handleSearch}
          className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-6 rounded-lg transition-colors"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

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
            <option value={20}>20</option>
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

      <div className="responsive-table-wrap border border-gray-200 rounded-lg shadow-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-t border-b border-gray-300 bg-gray-100/80">
              {visibleKeys.map((header) => (
                <th
                  key={header}
                  className="p-4 font-bold text-gray-800 whitespace-nowrap border-r border-gray-200 last:border-r-0"
                >
                  <div className="flex items-center gap-2">
                    {formatColumnLabel(header)}
                    <ChevronsUpDown size={14} className="text-gray-400" />
                  </div>
                </th>
              ))}

              <th className="p-4 font-bold text-gray-800 whitespace-nowrap border-r border-gray-200">
                <div className="flex items-center gap-2">
                  DeliveryAttempts
                  <ChevronsUpDown size={14} className="text-gray-400" />
                </div>
              </th>

              {attemptColumnNumbers.map((attemptNumber) => (
                <th
                  key={`attempt-header-${attemptNumber}`}
                  className="p-4 font-bold text-gray-800 whitespace-nowrap border-r border-gray-200 last:border-r-0"
                >
                  <div className="flex items-center gap-2">
                    {`Attempt ${attemptNumber}`}
                    <ChevronsUpDown size={14} className="text-gray-400" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {currentRows.length > 0 ? (
              currentRows.map((row, index) => (
                <tr
                  key={`${row.order_id || "order"}-${index}`}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {visibleKeys.map((key, i) => (
                    <td
                      key={`${key}-${i}`}
                      className="p-4 text-gray-600 whitespace-nowrap"
                    >
                      {renderCellValue(row[key])}
                    </td>
                  ))}

                  <td className="p-4 text-gray-600 whitespace-nowrap font-semibold">
                    {Number(row.delivery_attempts || 0)}
                  </td>

                  {attemptColumnNumbers.map((attemptNumber) => {
                    const attempt = getAttemptByNumber(
                      row.delivery_attempt_list || [],
                      attemptNumber
                    );

                    return (
                      <td
                        key={`${row.order_id || index}-attempt-${attemptNumber}`}
                        className="p-4 text-gray-600 whitespace-nowrap"
                      >
                        {formatAttemptStatus(attempt)}
                      </td>
                    );
                  })}
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

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm font-semibold text-gray-800">
          Showing {totalRows > 0 ? indexOfFirstRow + 1 : 0} to{" "}
          {indexOfLastRow} of {totalRows} entries
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

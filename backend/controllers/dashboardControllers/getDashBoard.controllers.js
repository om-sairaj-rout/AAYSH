const { toISTDate } = require("../../utils/dateTime");
const { applyCompanyOrderFilter } = require("../../utils/companyScope");
const { buildDashboardAnalytics } = require("../../utils/dashboardAnalytics");
const {
  fetchDashboardYearOrders,
  buildStatsFromOrders,
} = require("../../utils/dashboardStatsAggregate");
const { getCached, setCached, stableKey } = require("../../utils/dashboardCache");
const {
  getWalletSummary,
  isWalletEnabledForCompany,
  WALLET_MIN_BALANCE,
} = require("../../utils/walletService");
const { perfLog } = require("../../utils/performanceLog");

const getISTYear = (date) => {
  const istDate = toISTDate(date);
  return istDate ? istDate.split("-")[0] : null;
};

const getISTMonthIndex = (date) => {
  const istDate = toISTDate(date);
  return istDate ? Number(istDate.split("-")[1]) - 1 : -1;
};

const getISTDay = (date) => {
  const istDate = toISTDate(date);
  return istDate ? Number(istDate.split("-")[2]) : -1;
};

const filterOrdersByDateRange = (orders, fromDate, toDate) => {
  if (!fromDate && !toDate) return orders;

  return orders.filter((order) => {
    const date = order.orderDate || order.createdAt;
    if (!date) return false;

    const istDate = toISTDate(date);
    if (!istDate) return false;
    if (fromDate && istDate < fromDate) return false;
    if (toDate && istDate > toDate) return false;
    return true;
  });
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const daysInMonth = (year, monthIndex) =>
  new Date(Number(year), monthIndex + 1, 0).getDate();

const getISTWeekdayShort = (year, monthIndex, day) => {
  const month = String(monthIndex + 1).padStart(2, "0");
  const dayStr = String(day).padStart(2, "0");
  const date = new Date(`${year}-${month}-${dayStr}T12:00:00+05:30`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(date);
};

const buildMonthlyChartData = (yearOrders) =>
  MONTHS.map((month, index) => {
    const monthOrders = yearOrders.filter((order) => {
      const date = order.orderDate || order.createdAt;
      return date && getISTMonthIndex(date) === index;
    });

    return {
      name: month,
      orders: monthOrders.length,
      cost: monthOrders.reduce(
        (acc, curr) => acc + Number(curr.invoiceValue || 0),
        0
      ),
    };
  });

const buildWeeklyChartData = (yearOrders, year, monthIndex, weekNumber) => {
  const startDay = (weekNumber - 1) * 7 + 1;
  const maxDay = daysInMonth(year, monthIndex);
  const chartData = [];

  for (let offset = 0; offset < 7; offset += 1) {
    const day = startDay + offset;

    if (day > maxDay) {
      chartData.push({
        name: "-",
        label: "-",
        orders: 0,
        cost: 0,
      });
      continue;
    }

    const dayOrders = yearOrders.filter((order) => {
      const date = order.orderDate || order.createdAt;
      if (!date) return false;

      return (
        getISTYear(date) === String(year) &&
        getISTMonthIndex(date) === monthIndex &&
        getISTDay(date) === day
      );
    });

    chartData.push({
      name: getISTWeekdayShort(year, monthIndex, day),
      label: `${day} ${MONTHS[monthIndex]}`,
      orders: dayOrders.length,
      cost: dayOrders.reduce(
        (acc, curr) => acc + Number(curr.invoiceValue || 0),
        0
      ),
    });
  }

  return chartData;
};

const logTiming = (label, startMs) => {
  const elapsed = Date.now() - startMs;
  perfLog(`[dashboard] ${label}: ${elapsed}ms`);
  return elapsed;
};

const getDashboardController = async (req, res) => {
  const requestStarted = Date.now();
  try {

    const isAdmin = req.user.role === "admin";

    const selectedYear = req.query.year;
    const chartView = req.query.view === "week" ? "week" : "month";
    const selectedMonth = Math.min(
      12,
      Math.max(1, Number(req.query.month) || new Date().getMonth() + 1)
    );
    const selectedWeek = Math.min(
      4,
      Math.max(1, Number(req.query.week) || 1)
    );
    const companyId = String(req.query.companyId || req.query.company_id || "").trim();
    const fromDate = req.query.from || null;
    const toDate = req.query.to || null;
    const analyticsOnly =
      req.query.analytics_only === "1" || req.query.analytics_only === "true";

    let filter = {};

    if (isAdmin) {
      if (companyId && companyId !== "ALL") {
        filter.companyID = companyId;
      }
    } else {
      filter = applyCompanyOrderFilter(req, filter);
    }

    const cacheKey = stableKey({
      filter,
      selectedYear,
      fromDate,
      toDate,
      chartView,
      selectedMonth,
      selectedWeek,
      companyId,
      analyticsOnly,
      role: req.user.role,
      companyID: req.user.companyID,
    });

    const bodyCacheKey = `${cacheKey}::body`;
    let cachedBody = getCached(bodyCacheKey);

    if (!cachedBody) {
      const fetchStarted = Date.now();
      const yearOrders = await fetchDashboardYearOrders(
        filter,
        selectedYear,
        fromDate,
        toDate
      );
      logTiming(`fetch year orders (${yearOrders.length} rows)`, fetchStarted);

      const { stats, totalCost } = buildStatsFromOrders(yearOrders);

      const analyticsStarted = Date.now();
      const { salesAnalytics, shipmentAnalytics, riskAnalytics } =
        buildDashboardAnalytics(yearOrders, { lightweight: true });
      logTiming("build analytics", analyticsStarted);

      if (analyticsOnly) {
        cachedBody = {
          stats,
          salesAnalytics,
          shipmentAnalytics,
          riskAnalytics,
          totalCost,
        };
      } else {
        const chartData =
          chartView === "week"
            ? buildWeeklyChartData(
                yearOrders,
                selectedYear || new Date().getFullYear(),
                selectedMonth - 1,
                selectedWeek
              )
            : buildMonthlyChartData(yearOrders);

        const cityMap = {};

        yearOrders.forEach((order) => {
          const city = order.destinationCity || "Unknown";

          if (!cityMap[city]) {
            cityMap[city] = {
              city,
              orders: 0,
              cost: 0,
            };
          }

          cityMap[city].orders += 1;
          cityMap[city].cost += Number(order.invoiceValue || 0);
        });

        const topCities = Object.values(cityMap)
          .sort((a, b) => b.orders - a.orders)
          .slice(0, 20);

        cachedBody = {
          stats,
          chartData,
          chartView,
          chartMeta:
            chartView === "week"
              ? {
                  month: selectedMonth,
                  week: selectedWeek,
                  monthName: MONTHS[selectedMonth - 1],
                }
              : null,
          topCities,
          salesAnalytics,
          shipmentAnalytics,
          riskAnalytics,
          totalCost,
        };
      }
      setCached(bodyCacheKey, cachedBody);
    } else {
      logTiming("dashboard body cache hit", Date.now());
    }

    let wallet = null;
    if (analyticsOnly) {
      logTiming("total request (analytics_only)", requestStarted);
      return res.status(200).json({
        success: true,
        ...cachedBody,
      });
    }

    const walletCompanyID = isAdmin
      ? companyId && companyId !== "ALL"
        ? companyId
        : null
      : String(req.user?.companyID || "").trim();

    if (walletCompanyID) {
      const enabled = await isWalletEnabledForCompany(walletCompanyID);
      if (enabled) {
        const summary = await getWalletSummary(walletCompanyID);
        wallet = {
          walletEnabled: true,
          balance: summary.balance,
          totalCredit: summary.totalCredit,
          totalDebit: summary.totalDebit,
          lowBalance: summary.balance < WALLET_MIN_BALANCE,
          minBalance: WALLET_MIN_BALANCE,
        };
      } else {
        wallet = { walletEnabled: false };
      }
    }

    logTiming("total request", requestStarted);

    return res.status(200).json({
      success: true,

      wallet,

      ...cachedBody,
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

module.exports = getDashboardController;
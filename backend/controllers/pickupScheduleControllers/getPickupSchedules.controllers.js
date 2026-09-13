const PickupSchedule = require("../../models/pickupSchedule.model");
const {
  buildScheduleTabMatch,
  formatPickupSchedule,
} = require("../../utils/pickupScheduleHelpers");
const {
  parsePagination,
  buildPaginationMeta,
} = require("../../utils/pagination");

const buildCompanyScope = (user) => {
  if (user.role === "admin" && !user.permissionsManaged) {
    return {};
  }
  if (user.companyID) {
    return { companyID: user.companyID };
  }
  return { scheduledBy: user.id };
};

const countByTabs = async (baseFilter) => {
  const tabs = ["today", "future", "scheduled", "completed", "cancelled", "all"];
  const counts = {};

  await Promise.all(
    tabs.map(async (tab) => {
      const match = { ...baseFilter, ...buildScheduleTabMatch(tab) };
      counts[tab] = await PickupSchedule.countDocuments(match);
    })
  );

  return counts;
};

const listPickupSchedules = async (req, res) => {
  try {
    const { tab = "scheduled", search } = req.query;
    const { page, perPage, skip } = parsePagination(req.query, 20);
    const companyScope = buildCompanyScope(req.user);

    const adminCompanyFilter =
      req.user.role === "admin" && req.query.company_id
        ? { companyID: String(req.query.company_id).trim().toUpperCase() }
        : {};

    const filter = {
      ...companyScope,
      ...adminCompanyFilter,
      ...buildScheduleTabMatch(tab),
    };

    if (search && String(search).trim()) {
      const term = String(search).trim();
      filter.$or = [
        { scheduleId: { $regex: term, $options: "i" } },
        { pickupLocation: { $regex: term, $options: "i" } },
        { externalOrderId: { $regex: term, $options: "i" } },
      ];
    }

    const [items, total, counts] = await Promise.all([
      PickupSchedule.find(filter)
        .sort({ pickupDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .lean(),
      PickupSchedule.countDocuments(filter),
      countByTabs({ ...companyScope, ...adminCompanyFilter }),
    ]);

    return res.json({
      success: true,
      data: items.map(formatPickupSchedule),
      counts,
      meta: {
        pagination: buildPaginationMeta({ page, perPage, total }),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = listPickupSchedules;

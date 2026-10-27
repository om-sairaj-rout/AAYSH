const mongoose = require("mongoose");
const User = require("../../models/user.model");
const Company = require("../../models/company.model");
const {
  parsePagination,
  buildPaginationMeta,
} = require("../../utils/pagination");
const {
  paginateMergedPickupPage,
  countShipmentTabs,
  addScheduleCounts,
  countSchedulesByPickupTabs,
} = require("../../utils/adminPickupPaginate");
const { perfLog } = require("../../utils/performanceLog");

const isTestCompanyId = (companyID) =>
  /^TEST-ORDER-ID/i.test(String(companyID || "").trim());

const buildAdminCompanyOptions = async () => {
  const [companies, owners] = await Promise.all([
    Company.find({ isActive: { $ne: false } })
      .select("companyID companyName")
      .sort({ companyName: 1 })
      .lean(),
    User.find({ companyRole: "owner" })
      .select("companyID email")
      .lean(),
  ]);

  const ownerByCompany = new Map(
    owners.map((owner) => [owner.companyID, owner])
  );

  return companies
    .filter((company) => !isTestCompanyId(company.companyID))
    .map((company) => ({
      companyID: company.companyID,
      companyName: company.companyName || company.companyID,
      email: ownerByCompany.get(company.companyID)?.email || "",
    }));
};

const resolveCompanyFilterId = async ({ company_id, user_id }) => {
  const directCompanyId =
    company_id && company_id !== "ALL"
      ? String(company_id).trim().toUpperCase()
      : null;

  if (directCompanyId) {
    return directCompanyId;
  }

  const userFilterId =
    user_id && user_id !== "ALL" ? String(user_id).trim() : null;

  if (!userFilterId) {
    return null;
  }

  if (mongoose.Types.ObjectId.isValid(userFilterId)) {
    const userDoc = await User.findById(userFilterId).select("companyID").lean();
    if (userDoc?.companyID) {
      return String(userDoc.companyID).trim().toUpperCase();
    }
  }

  return String(userFilterId).trim().toUpperCase();
};

const getAdminPickups = async (req, res) => {
  const started = Date.now();
  try {
    const { tab = "today", search, user_id, company_id } = req.query;
    const countsOnly =
      req.query.counts_only === "1" || req.query.counts_only === "true";
    const includeCounts =
      countsOnly ||
      req.query.include_counts === "1" ||
      req.query.include_counts === "true";
    const includeCompanies =
      countsOnly ||
      req.query.include_companies === "1" ||
      req.query.include_companies === "true";

    const { page, perPage, skip } = parsePagination(req.query, 20);
    const searchTerm = search ? String(search).trim() : "";

    const companyFilterId = await resolveCompanyFilterId({
      company_id,
      user_id,
    });

    const scheduleScope = companyFilterId ? { companyID: companyFilterId } : {};

    let counts = null;
    if (includeCounts) {
      const [shipmentCounts, scheduleCounts] = await Promise.all([
        countShipmentTabs(companyFilterId),
        countSchedulesByPickupTabs(scheduleScope),
      ]);
      counts = addScheduleCounts(shipmentCounts, scheduleCounts);
    }

    if (countsOnly) {
      const companies = includeCompanies ? await buildAdminCompanyOptions() : [];
      perfLog(`[admin-pickups] counts_only ${Date.now() - started}ms`);
      return res.json({
        success: true,
        counts,
        users: companies.map((company) => ({
          id: company.companyID,
          companyID: company.companyID,
          name: company.companyName || company.companyID || "Unknown",
          email: company.email || "",
        })),
      });
    }

    const { data: formatted, total } = await paginateMergedPickupPage({
      tab,
      companyFilterId,
      searchTerm,
      skip,
      perPage,
      scheduleScope,
    });

    const companies = includeCompanies ? await buildAdminCompanyOptions() : [];

    perfLog(
      `[admin-pickups] tab=${tab} page=${page} rows=${formatted.length} ${Date.now() - started}ms`
    );

    return res.json({
      success: true,
      data: formatted,
      counts,
      users: companies.map((company) => ({
        id: company.companyID,
        companyID: company.companyID,
        name: company.companyName || company.companyID || "Unknown",
        email: company.email || "",
      })),
      meta: {
        pagination: buildPaginationMeta(total, page, perPage, formatted.length),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = getAdminPickups;

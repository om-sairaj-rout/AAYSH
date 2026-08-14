const parsePagination = (query, defaultPerPage = 20, maxPerPage = 100) => {
  const page = Math.max(1, Number(query.page) || 1);
  const perPage = Math.min(
    maxPerPage,
    Math.max(1, Number(query.per_page) || defaultPerPage)
  );
  const skip = (page - 1) * perPage;

  return { page, perPage, skip };
};

const buildPaginationMeta = (total, page, perPage, count) => ({
  total,
  count,
  per_page: perPage,
  current_page: page,
  total_pages: Math.ceil(total / perPage) || 1,
});

module.exports = {
  parsePagination,
  buildPaginationMeta,
};

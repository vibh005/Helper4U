exports.getPaging = (q) => {
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 20, 1), 100);
  return { page, limit, offset: (page - 1) * limit };
};
exports.pageMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  pages: Math.ceil(total / limit) || 1,
});

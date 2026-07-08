/**
 * Parse and validate pagination query params
 */
const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  // Allow up to 500 rows — needed for admin product listing
  const limit = Math.min(500, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

/**
 * Build paginated response envelope
 */
const paginate = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

module.exports = { getPagination, paginate };

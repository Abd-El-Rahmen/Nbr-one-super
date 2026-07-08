const CustomerModel = require('./model');
const AppError = require('../../utils/AppError');
const { getPagination, paginate } = require('../../utils/pagination.helper');

const getAll = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const filters = { search: query.search };
  const [customers, total] = await Promise.all([
    CustomerModel.findAll({ limit, offset, ...filters }),
    CustomerModel.countAll(filters),
  ]);
  return paginate(customers, total, page, limit);
};

const getById = async (id) => {
  const customer = await CustomerModel.findById(id);
  if (!customer) throw new AppError('Customer not found.', 404);
  const orders = await CustomerModel.findOrdersByCustomer(id);
  return { ...customer, orders };
};

module.exports = { getAll, getById };

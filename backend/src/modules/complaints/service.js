const ComplaintModel = require('./model');
const AppError = require('../../utils/AppError');
const { getPagination, paginate } = require('../../utils/pagination.helper');

const getAll = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const filters = { status: query.status };
  const [complaints, total] = await Promise.all([
    ComplaintModel.findAll({ limit, offset, ...filters }),
    ComplaintModel.countAll(filters),
  ]);
  return paginate(complaints, total, page, limit);
};

const getById = async (id) => {
  const complaint = await ComplaintModel.findById(id);
  if (!complaint) throw new AppError('Complaint not found.', 404);
  return complaint;
};

const create = async (data) => {
  const id = await ComplaintModel.create(data);
  return ComplaintModel.findById(id);
};

const updateStatus = async (id, status) => {
  await getById(id);
  await ComplaintModel.updateStatus(id, status);
  return ComplaintModel.findById(id);
};

module.exports = { getAll, getById, create, updateStatus };

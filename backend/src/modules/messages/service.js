const MessageModel = require('./model');
const { getPagination, paginate } = require('../../utils/pagination.helper');

const getByOrderId = async (order_id) => {
  return MessageModel.findByOrderId(order_id);
};

const getAll = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const [messages, total] = await Promise.all([
    MessageModel.findAll({ limit, offset }),
    MessageModel.countAll(),
  ]);
  return paginate(messages, total, page, limit);
};

const create = async (data) => {
  const id = await MessageModel.create(data);
  return MessageModel.findById(id);
};

module.exports = { getByOrderId, getAll, create };

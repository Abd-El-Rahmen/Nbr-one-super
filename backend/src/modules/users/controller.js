const UserService = require('./service');

const getAll = async (req, res, next) => {
  try {
    const users = await UserService.getAllUsers();
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const user = await UserService.getUserById(req.params.id);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const user = await UserService.createUser(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const user = await UserService.updateUser(req.params.id, req.body);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await UserService.deleteUser(parseInt(req.params.id), req.user.id);
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getOne, create, update, remove };

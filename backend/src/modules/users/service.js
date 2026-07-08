const bcrypt = require('bcryptjs');
const UserModel = require('./model');
const AppError = require('../../utils/AppError');

const getAllUsers = async () => {
  return UserModel.findAll();
};

const getUserById = async (id) => {
  const user = await UserModel.findById(id);
  if (!user) throw new AppError('User not found.', 404);
  return user;
};

const createUser = async ({ name, email, password, role }) => {
  const existing = await UserModel.findByEmail(email);
  if (existing) throw new AppError('Email already in use.', 409);

  const password_hash = await bcrypt.hash(password, 12);
  const id = await UserModel.create({ name, email, password_hash, role });
  return UserModel.findById(id);
};

const updateUser = async (id, updates) => {
  await getUserById(id); // ensure exists

  if (updates.password) {
    updates.password_hash = await bcrypt.hash(updates.password, 12);
    delete updates.password;
  }

  if (updates.email) {
    const existing = await UserModel.findByEmail(updates.email);
    if (existing && existing.id !== id) throw new AppError('Email already in use.', 409);
  }

  await UserModel.update(id, updates);
  return UserModel.findById(id);
};

const deleteUser = async (id, requesterId) => {
  if (id === requesterId) throw new AppError('You cannot delete your own account.', 400);
  await getUserById(id);
  await UserModel.remove(id);
};

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser };

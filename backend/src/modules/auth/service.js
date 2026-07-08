const bcrypt = require('bcryptjs');
const { generateToken } = require('../../utils/jwt.helper');
const AuthModel = require('./model');
const AppError = require('../../utils/AppError');

const login = async ({ email, password }) => {
  const user = await AuthModel.findByEmail(email);

  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new AppError('Invalid email or password.', 401);
  }

  const token = generateToken({ id: user.id, email: user.email, role: user.role });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

const getMe = async (userId) => {
  const user = await AuthModel.findById(userId);
  if (!user) throw new AppError('User not found.', 404);
  return user;
};

module.exports = { login, getMe };

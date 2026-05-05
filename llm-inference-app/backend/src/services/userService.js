const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const FileStore = require('../database/fileStore');
const config = require('../config/config');
const { isValidEmail, isValidPassword } = require('../utils/validators');

class UserService {
  static async registerUser(email, password) {
    if (!isValidEmail(email)) {
      const error = new Error('Invalid email format');
      error.status = 400;
      throw error;
    }
    if (!isValidPassword(password)) {
      const error = new Error('Password does not meet requirements');
      error.status = 400;
      throw error;
    }
    const existingUser = await FileStore.findUserByEmail(email);
    if (existingUser) {
      const error = new Error('Email already exists');
      error.status = 409;
      throw error;
    }
    const password_hash = await bcryptjs.hash(password, 10);
    const newUser = await FileStore.createUser({ email, password_hash });
    return { userId: newUser.user_id, email: newUser.email };
  }

  static async loginUser(email, password) {
    if (!isValidEmail(email)) {
      const error = new Error('Invalid email format');
      error.status = 400;
      throw error;
    }
    const user = await FileStore.findUserByEmail(email);
    if (!user) {
      const error = new Error('Invalid email or password');
      error.status = 401;
      throw error;
    }
    const isValid = await bcryptjs.compare(password, user.password_hash);
    if (!isValid) {
      const error = new Error('Invalid email or password');
      error.status = 401;
      throw error;
    }
    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiration }
    );
    return {
      token,
      user: { userId: user.user_id, email: user.email }
    };
  }

  static async getUserProfile(userId) {
    const user = await FileStore.findUserById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    return { userId: user.user_id, email: user.email };
  }
}

module.exports = UserService;

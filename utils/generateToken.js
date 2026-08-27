const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRE, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRE } = require('../config/env');

const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRE
  });

  const refreshToken = jwt.sign(
    { id: payload.id }, 
    JWT_REFRESH_SECRET, 
    { expiresIn: JWT_REFRESH_EXPIRE }
  );

  return { accessToken, refreshToken };
};

const verifyToken = (token, isRefresh = false) => {
  const secret = isRefresh ? JWT_REFRESH_SECRET : JWT_SECRET;
  return jwt.verify(token, secret);
};

module.exports = { generateTokens, verifyToken };

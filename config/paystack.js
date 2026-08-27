const axios = require('axios');
const { PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY } = require('./env');

const paystack = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

module.exports = { paystack, PAYSTACK_PUBLIC_KEY };

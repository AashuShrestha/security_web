const express = require('express');
const router = express.Router();
const { getOrderForPayment } = require('../controllers/orderController');
const { createPayment } = require('../controllers/paymentController');

router.post('/verify-payment', getOrderForPayment, createPayment);

module.exports = router;
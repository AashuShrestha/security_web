// controllers/paymentController.js
const Payment = require('../model/paymentModel');
const Cart = require('../model/cartModel');

const createPayment = async (req, res) => {
    console.log("Create payment:", req.body);
    console.log("Request order:", req.order);
    try {
      if (!req.order) {
        return res.status(400).json({ error: 'Order not found in request' });
      }
  
      const paymentData = {
        user: req.order.userId,
        amt: req.body.amt,
        oid: req.order._id,
        cardNumber: req.body.cardNumber,
        expirationDate: req.body.expirationDate,
        cvc: req.body.cvc,
      };
  
      console.log("Payment data:", paymentData);
  
      const payment = new Payment(paymentData);
      const createdPayment = await payment.save();
  
      await Cart.deleteMany({ user: req.order.userId });
  
      res.json({ message: "Payment Created Successfully", payment: createdPayment });
    } catch (err) {
      console.error(err);
      return res.status(400).json({ error: err.message || 'Failed to create payment' });
    }
  };

module.exports = { createPayment };
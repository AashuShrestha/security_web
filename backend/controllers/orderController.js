

const Cart = require('../model/cartModel');
const mongoose = require("mongoose");
const Order = require('../model/orderModel');

// Create Order
const createOrder = async (req, res) => {
  const { userId, products, totalAmount, deliveryDetails } = req.body;

  console.log(req.body);

  // Validate data
  if (!userId || !products || !totalAmount || !deliveryDetails) {
    return res.status(400).json({
      success: false,
      message: "Please provide all the fields.",
    });
  }

  try {
    const order = new Order({
      userId,
      products,
      totalAmount,
      deliveryDetails, // Include delivery details in the order
    });
    await order.save();



    // Remove ordered products from the user's cart
    // const productIds = products.map(p => new mongoose.Types.ObjectId(p.product));
    // console.log("productIds to remove:", productIds);

    // const updateResult = await Cart.updateOne(
    //   { user: userId },
    //   { $pull: { products: { product: { $in: productIds } } } }
    // );

    // Debug line to check the result of the update operation
    // console.log("Cart update result:", updateResult);

    res.status(201).json({ message: 'Order created successfully', order });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get Orders
const getOrders = async (req, res) => {
  try {
    // Assuming you have an isAdmin check middleware to ensure the user is an admin

    // Retrieve all orders and populate necessary fields from related models
    const orders = await Order.find({})
      .populate({
        path: 'userId',
        select: 'firstName email' // Assuming you want to select specific fields from the user model
      })
      .populate({
        path: 'products.product',
        select: 'productName productPrice' // Assuming you want to select specific fields from the product model
      });

    return res.json({
      success: true,
      message: "All orders fetched successfully",
      orders: orders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get Orders by User ID
const getOrdersByUserId = async (req, res) => {
  const userId = req.params.userId;
  console.log(userId);
  try {
    const orders = await Order.find({ userId })
      .populate('userId')
      .populate({
        path: 'products.product',
        select: 'productName' // Assuming you want to select specific fields from the product model
      });
    return res.json({
      success: true,
      message: "Your orders fetched successfully",
      orders: orders,
    });
  } catch (error) {
    throw new Error(`Error while fetching orders: ${error.message}`);
  }
};


// const getOrderForPayment = async (req, res, next) => {
//   console.log("get order for payment" , req.body)
//   try {
//     const order = await Order.findById(req.body.oid);
//     if (!order) {
//       return res.status(400).json({ error: 'No order found' });
//     }
//     order.status = "paid and processing";
//     const updatedOrder = await order.save();
//     req.order = updatedOrder;
//     next();
//   } catch (err) {
//     return res.status(400).json({ error: err.message || 'No Order found' });
//   }
// };

const getOrderForPayment = async (req, res, next) => {
  console.log("get order for payment:", req.body);
  try {
    const order = await Order.findById(req.body.oid);
    if (!order) {
      return res.status(400).json({ error: 'No order found' });
    }
    order.status = "paid and processing";
    const updatedOrder = await order.save();
    req.order = updatedOrder;
    next();
  } catch (err) {
    return res.status(400).json({ error: err.message || 'No Order found' });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrdersByUserId,
  getOrderForPayment
};

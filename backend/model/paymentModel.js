// const mongoose = require('mongoose');

// const paymentSchema = mongoose.Schema(
//     {
//         user: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: 'User',
//             required: true,
//         },
//         amount: {
//             type: Number,
//             required: true,
//             default: 0,
//         },
//         oid: {
//             type: mongoose.Schema.Types.ObjectId,
//             required: true,
//             unique: true,
//         },
//     },
//     {
//         timestamps: true,
//     }
// );
// module.exports = mongoose.model('Payment', paymentSchema);;

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amt: {
      type: Number,
      required: true,
      default: 0,
    },
    oid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    cardNumber: {
      type: String,
      required: true,
    },
    expirationDate: {
      type: String,
      required: true,
    },
    cvc: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Payment', paymentSchema);

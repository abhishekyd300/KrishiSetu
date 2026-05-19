const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true
  },
  cropName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  pricePerUnit: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'payment_held', 'dispatched', 'delivered', 'completed', 'cancelled', 'disputed'],
    default: 'pending'
  },
  deliveryAddress: {
    address: String,
    city: String,
    state: String,
    pincode: String,
    phone: String
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'held', 'released', 'refunded'],
    default: 'pending'
  },
  escrowHeld: {
    type: Boolean,
    default: false
  },
  dispatchedAt: Date,
  deliveredAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);

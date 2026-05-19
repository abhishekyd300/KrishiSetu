const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cropName: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['vegetables', 'fruits', 'grains', 'pulses', 'spices', 'other'],
    required: true
  },
  pricePerUnit: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    enum: ['kg', 'quintal', 'ton', 'piece', 'dozen'],
    default: 'kg'
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    trim: true
  },
  images: [{
    type: String
  }],
  organic: {
    type: Boolean,
    default: false
  },
  harvestDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'sold', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Listing', listingSchema);

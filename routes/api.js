const express = require('express');
const router = express.Router();
const { isAuth } = require('../middleware/auth');
const Listing = require('../models/Listing');
const Order = require('../models/Order');

// Search listings
router.get('/listings/search', async (req, res) => {
  try {
    const { q, category } = req.query;
    let query = { status: 'active' };
    
    if (q) {
      query.cropName = { $regex: q, $options: 'i' };
    }
    if (category && category !== 'all') {
      query.category = category;
    }

    const listings = await Listing.find(query)
      .populate('farmer', 'name rating')
      .sort({ createdAt: -1 });
    
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get order details
router.get('/orders/:id', isAuth, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      $or: [
        { buyer: req.session.user.id },
        { farmer: req.session.user.id }
      ]
    })
    .populate('buyer', 'name email phone')
    .populate('farmer', 'name email phone')
    .populate('listing', 'cropName images');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

module.exports = router;

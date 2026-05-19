const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');

// Home page
router.get('/', async (req, res) => {
  try {
    const listings = await Listing.find({ status: 'active' })
      .populate('farmer', 'name')
      .sort({ createdAt: -1 })
      .limit(6);
    res.render('index', { title: 'Farmer Direct Market', listings });
  } catch (err) {
    console.error(err);
    res.render('index', { title: 'Farmer Direct Market', listings: [] });
  }
});

module.exports = router;

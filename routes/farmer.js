const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { isAuth, isFarmer } = require('../middleware/auth');
const Listing = require('../models/Listing');
const Order = require('../models/Order');
const upload = require('../config/multer');
const imagekit = require('../config/imagekit');

// Dashboard
router.get('/dashboard', isAuth, isFarmer, async (req, res) => {
  try {
    const activeListings = await Listing.countDocuments({ 
      farmer: req.session.user.id, 
      status: 'active' 
    });
    const pendingOrders = await Order.countDocuments({ 
      farmer: req.session.user.id, 
      status: { $in: ['pending', 'payment_held'] }
    });
    const totalEarned = await Order.aggregate([
      { 
        $match: { 
          farmer: new mongoose.Types.ObjectId(req.session.user.id),
          status: 'completed'
        }
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    res.render('farmer/dashboard', {
      title: 'Farmer Dashboard',
      activeListings,
      pendingOrders,
      totalEarned: totalEarned[0]?.total || 0
    });
  } catch (err) {
    console.error(err);
    res.render('farmer/dashboard', {
      title: 'Farmer Dashboard',
      activeListings: 0,
      pendingOrders: 0,
      totalEarned: 0
    });
  }
});

// My Listings
router.get('/listings', isAuth, isFarmer, async (req, res) => {
  try {
    const listings = await Listing.find({ farmer: req.session.user.id })
      .sort({ createdAt: -1 });
    res.render('farmer/listings', { title: 'My Listings', listings });
  } catch (err) {
    console.error(err);
    res.render('farmer/listings', { title: 'My Listings', listings: [] });
  }
});

// Add Listing - Form
router.get('/listings/new', isAuth, isFarmer, (req, res) => {
  res.render('farmer/add-listing', { title: 'Add Crop Listing', error: null });
});

// Add Listing - POST
router.post('/listings', isAuth, isFarmer, upload.array('images', 4), async (req, res) => {
  try {
    const { cropName, category, pricePerUnit, unit, quantity, description, organic, harvestDate } = req.body;
    
    const images = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => 
        imagekit.files.upload({
          file: file.buffer.toString('base64'),
          fileName: Date.now() + '-' + file.originalname
        })
      );
      const uploadResults = await Promise.all(uploadPromises);
      uploadResults.forEach(result => images.push(result.url));
    }
    
    const listing = new Listing({
      farmer: req.session.user.id,
      cropName,
      category,
      pricePerUnit,
      unit,
      quantity,
      description,
      organic: organic === 'on',
      harvestDate: harvestDate || undefined,
      images
    });

    await listing.save();
    res.redirect('/farmer/listings');
  } catch (err) {
    console.error(err);
    res.render('farmer/add-listing', { 
      title: 'Add Crop Listing', 
      error: 'Failed to add listing. Please try again.' 
    });
  }
});

// Delete Listing
router.delete('/listings/:id', isAuth, isFarmer, async (req, res) => {
  try {
    await Listing.findOneAndDelete({ 
      _id: req.params.id, 
      farmer: req.session.user.id 
    });
    res.redirect('/farmer/listings');
  } catch (err) {
    console.error(err);
    res.redirect('/farmer/listings');
  }
});

// My Orders
router.get('/orders', isAuth, isFarmer, async (req, res) => {
  try {
    const orders = await Order.find({ farmer: req.session.user.id })
      .populate('buyer', 'name email phone')
      .populate('listing', 'cropName unit')
      .sort({ createdAt: -1 });
    res.render('farmer/orders', { title: 'My Orders', orders });
  } catch (err) {
    console.error(err);
    res.render('farmer/orders', { title: 'My Orders', orders: [] });
  }
});

// Update Order Status
router.post('/orders/:id/dispatch', isAuth, isFarmer, async (req, res) => {
  try {
    await Order.findOneAndUpdate(
      { _id: req.params.id, farmer: req.session.user.id },
      { status: 'dispatched', dispatchedAt: new Date() }
    );
    res.redirect('/farmer/orders');
  } catch (err) {
    console.error(err);
    res.redirect('/farmer/orders');
  }
});

// Bank Details View
router.get('/bank-details', isAuth, isFarmer, async (req, res) => {
  try {
    const farmer = await require('../models/User').findById(req.session.user.id);
    res.render('farmer/bank-details', { 
      title: 'Payment Methods', 
      farmer,
      success: req.query.success === '1' ? 'Bank details updated successfully!' : null,
      error: null 
    });
  } catch (err) {
    console.error(err);
    res.redirect('/farmer/dashboard');
  }
});

// Update Bank Details
router.post('/bank-details', isAuth, isFarmer, async (req, res) => {
  try {
    const { accountName, accountNumber, ifscCode, upiId } = req.body;
    await require('../models/User').findByIdAndUpdate(req.session.user.id, {
      bankDetails: { accountName, accountNumber, ifscCode, upiId }
    });
    res.redirect('/farmer/bank-details?success=1');
  } catch (err) {
    console.error(err);
    const farmer = await require('../models/User').findById(req.session.user.id);
    res.render('farmer/bank-details', { 
      title: 'Payment Methods', 
      farmer,
      success: null,
      error: 'Failed to update bank details.' 
    });
  }
});

module.exports = router;

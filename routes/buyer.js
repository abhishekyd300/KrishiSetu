const express = require('express');
const router = express.Router();
const { isAuth, isBuyer } = require('../middleware/auth');
const Listing = require('../models/Listing');
const Order = require('../models/Order');
const User = require('../models/User');

// Dashboard / Browse Listings
router.get('/dashboard', isAuth, isBuyer, async (req, res) => {
  try {
    const listings = await Listing.find({ status: 'active' })
      .populate('farmer', 'name rating')
      .sort({ createdAt: -1 });
    res.render('buyer/dashboard', { title: 'Browse Crops', listings });
  } catch (err) {
    console.error(err);
    res.render('buyer/dashboard', { title: 'Browse Crops', listings: [] });
  }
});

// View Listing Details
router.get('/listing/:id', isAuth, isBuyer, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('farmer', 'name email phone rating');
    
    if (!listing) {
      return res.redirect('/buyer/dashboard');
    }

    res.render('buyer/listing-details', { title: listing.cropName, listing });
  } catch (err) {
    console.error(err);
    res.redirect('/buyer/dashboard');
  }
});

// Place Order - Form
router.get('/order/:listingId', isAuth, isBuyer, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.listingId)
      .populate('farmer', 'name');
    
    if (!listing) {
      return res.redirect('/buyer/dashboard');
    }

    const buyer = await User.findById(req.session.user.id);
    res.render('buyer/place-order', { 
      title: 'Place Order', 
      listing, 
      buyer,
      error: null 
    });
  } catch (err) {
    console.error(err);
    res.redirect('/buyer/dashboard');
  }
});

// Place Order - POST
router.post('/order/:listingId', isAuth, isBuyer, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.listingId);
    
    if (!listing || listing.status !== 'active') {
      return res.redirect('/buyer/dashboard');
    }

    const { quantity, address, city, state, pincode, phone } = req.body;
    const quantityNum = parseFloat(quantity);

    if (quantityNum > listing.quantity) {
      const buyer = await User.findById(req.session.user.id);
      return res.render('buyer/place-order', { 
        title: 'Place Order', 
        listing: await listing.populate('farmer', 'name'),
        buyer,
        error: 'Requested quantity exceeds available stock' 
      });
    }

    const totalAmount = quantityNum * listing.pricePerUnit;

    const order = new Order({
      buyer: req.session.user.id,
      farmer: listing.farmer,
      listing: listing._id,
      cropName: listing.cropName,
      quantity: quantityNum,
      pricePerUnit: listing.pricePerUnit,
      totalAmount,
      deliveryAddress: { address, city, state, pincode, phone },
      status: 'pending',
      paymentStatus: 'pending'
    });

    await order.save();

    // Update listing quantity
    listing.quantity -= quantityNum;
    if (listing.quantity === 0) {
      listing.status = 'sold';
    }
    await listing.save();

    // Redirect to payment page instead of orders
    res.redirect(`/buyer/payment/${order._id}`);
  } catch (err) {
    console.error(err);
    res.redirect('/buyer/dashboard');
  }
});

// My Orders
router.get('/orders', isAuth, isBuyer, async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.session.user.id })
      .populate('farmer', 'name email phone')
      .populate('listing', 'cropName images')
      .sort({ createdAt: -1 });
    res.render('buyer/orders', { title: 'My Orders', orders });
  } catch (err) {
    console.error(err);
    res.render('buyer/orders', { title: 'My Orders', orders: [] });
  }
});

// Confirm Delivery
router.post('/orders/:id/confirm', isAuth, isBuyer, async (req, res) => {
  try {
    await Order.findOneAndUpdate(
      { _id: req.params.id, buyer: req.session.user.id },
      { 
        status: 'delivered', 
        deliveredAt: new Date(),
        paymentStatus: 'released'
      }
    );
    res.redirect('/buyer/orders');
  } catch (err) {
    console.error(err);
    res.redirect('/buyer/orders');
  }
});

// Payment Page
router.get('/payment/:orderId', isAuth, isBuyer, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      buyer: req.session.user.id
    })
    .populate('farmer', 'name')
    .populate('listing', 'cropName images');

    if (!order) {
      return res.redirect('/buyer/orders');
    }

    res.render('buyer/payment', {
      title: 'Complete Payment',
      order,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error(err);
    res.redirect('/buyer/orders');
  }
});

// Payment Success Callback
router.get('/payment-success', isAuth, isBuyer, (req, res) => {
  res.render('buyer/payment-success', { title: 'Payment Successful' });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { isAuth, isBuyer } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

// Create Razorpay order
router.post('/create-order', isAuth, isBuyer, paymentController.createOrder);

// Verify payment after successful payment
router.post('/verify', isAuth, isBuyer, paymentController.verifyPayment);

// Release payment to farmer (after delivery confirmation)
router.post('/release', isAuth, isBuyer, paymentController.releasePayment);

// Refund payment to buyer
router.post('/refund', isAuth, paymentController.refundPayment);

// Webhook endpoint (called by Razorpay)
router.post('/webhook', paymentController.webhook);

module.exports = router;

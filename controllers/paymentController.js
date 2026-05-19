const razorpay = require('../config/razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Listing = require('../models/Listing');

/**
 * Create Razorpay order
 * Called when buyer clicks "Pay Now"
 */
exports.createOrder = async (req, res) => {
  try {
    const { orderId } = req.body;

    // Get order from database
    const order = await Order.findById(orderId);
    if (!order || order.buyer.toString() !== req.session.user.id) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: order.totalAmount * 100, // Convert to paise
      currency: 'INR',
      receipt: order._id.toString(),
      notes: {
        orderId: order._id.toString(),
        buyerId: order.buyer.toString(),
        farmerId: order.farmer.toString(),
      },
    });

    // Update order with payment details
    order.paymentId = razorpayOrder.id;
    await order.save();

    res.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
};

/**
 * Verify payment signature
 * Called after successful payment
 */
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Update order status
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = 'payment_held';
    order.paymentStatus = 'held';
    order.escrowHeld = true;
    order.paymentId = razorpay_payment_id;
    await order.save();

    res.json({
      success: true,
      message: 'Payment verified successfully',
      order: {
        id: order._id,
        status: order.status,
      },
    });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
};

/**
 * Release payment to farmer
 * Called when buyer confirms delivery
 */
exports.releasePayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId)
      .populate('farmer', 'email phone');

    if (!order || order.buyer.toString() !== req.session.user.id) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ error: 'Order must be delivered first' });
    }

    // Verify farmer has bank details
    if (!order.farmer.bankDetails || (!order.farmer.bankDetails.accountNumber && !order.farmer.bankDetails.upiId)) {
      return res.status(400).json({ error: 'Farmer has not configured bank details for payout' });
    }

    // In a real production environment with RazorpayX, we would call the Payouts API here:
    /*
    await razorpay.payouts.create({
      account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER,
      amount: Math.round(order.totalAmount * 100),
      currency: "INR",
      mode: order.farmer.bankDetails.upiId ? "UPI" : "NEFT",
      purpose: "payout",
      fund_account: {
        account_type: order.farmer.bankDetails.upiId ? "vpa" : "bank_account",
        bank_account: {
          name: order.farmer.bankDetails.accountName,
          ifsc: order.farmer.bankDetails.ifscCode,
          account_number: order.farmer.bankDetails.accountNumber
        },
        vpa: { address: order.farmer.bankDetails.upiId }
      }
    });
    */
    
    // Since RazorpayX requires separate onboarding and live keys, we log the simulated payout
    console.log(`Simulated payout of ₹${order.totalAmount} to farmer ${order.farmer.email}`);
    
    // Update the status
    order.status = 'completed';
    order.paymentStatus = 'released';
    order.escrowHeld = false;
    order.completedAt = new Date();
    await order.save();

    res.json({
      success: true,
      message: 'Payment released to farmer',
    });
  } catch (err) {
    console.error('Release payment error:', err);
    res.status(500).json({ error: 'Failed to release payment' });
  }
};

/**
 * Refund payment to buyer
 * Called when order is cancelled
 */
exports.refundPayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check authorization
    const isBuyer = order.buyer.toString() === req.session.user.id;
    const isFarmer = order.farmer.toString() === req.session.user.id;
    if (!isBuyer && !isFarmer) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!order.paymentId || order.paymentStatus === 'refunded') {
      return res.status(400).json({ error: 'Cannot refund this order' });
    }

    // Create actual refund via Razorpay API
    try {
      await razorpay.payments.refund(order.paymentId, {
        amount: Math.round(order.totalAmount * 100)
      });
    } catch (razorpayErr) {
      console.error('Razorpay refund error:', razorpayErr);
      return res.status(400).json({ error: 'Failed to process refund with payment gateway' });
    }

    order.status = 'cancelled';
    order.paymentStatus = 'refunded';
    order.escrowHeld = false;
    await order.save();

    // Restore listing quantity
    await Listing.findByIdAndUpdate(order.listing, {
      $inc: { quantity: order.quantity },
      $set: { status: 'active' },
    });

    res.json({
      success: true,
      message: 'Payment refunded successfully',
    });
  } catch (err) {
    console.error('Refund payment error:', err);
    res.status(500).json({ error: 'Failed to refund payment' });
  }
};

/**
 * Webhook handler for Razorpay events
 * Called by Razorpay server when payment events occur
 */
exports.webhook = async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).send('Invalid signature');
    }

    const event = req.body.event;
    const payload = req.body.payload.payment.entity;

    switch (event) {
      case 'payment.captured':
        // Payment successful and captured
        const order = await Order.findOne({ paymentId: payload.order_id });
        if (order) {
          order.status = 'payment_held';
          order.paymentStatus = 'held';
          order.escrowHeld = true;
          await order.save();
        }
        break;

      case 'payment.failed':
        // Payment failed
        const failedOrder = await Order.findOne({ paymentId: payload.order_id });
        if (failedOrder) {
          failedOrder.status = 'pending';
          failedOrder.paymentStatus = 'failed';
          await failedOrder.save();
        }
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Webhook processing failed');
  }
};

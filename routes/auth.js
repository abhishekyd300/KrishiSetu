const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { isGuest } = require('../middleware/auth');

// Register page
router.get('/register', isGuest, (req, res) => {
  res.render('auth/register', { title: 'Register', error: null });
});

// Register POST
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('auth/register', { 
        title: 'Register', 
        error: 'Email already registered' 
      });
    }

    // Create user
    const user = new User({ name, email, password, role });
    await user.save();

    // Log them in
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    res.redirect(`/${role}/dashboard`);
  } catch (err) {
    console.error(err);
    res.render('auth/register', { 
      title: 'Register', 
      error: 'Registration failed. Please try again.' 
    });
  }
});

// Login page
router.get('/login', isGuest, (req, res) => {
  res.render('auth/login', { title: 'Login', error: null });
});

// Login POST
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.render('auth/login', { 
        title: 'Login', 
        error: 'Invalid email or password' 
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('auth/login', { 
        title: 'Login', 
        error: 'Invalid email or password' 
      });
    }

    // Set session
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    res.redirect(`/${user.role}/dashboard`);
  } catch (err) {
    console.error(err);
    res.render('auth/login', { 
      title: 'Login', 
      error: 'Login failed. Please try again.' 
    });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;

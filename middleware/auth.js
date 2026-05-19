// Check if user is authenticated
exports.isAuth = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect('/auth/login');
};

// Check if user is a farmer
exports.isFarmer = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'farmer') {
    return next();
  }
  res.status(403).send('Access denied. Farmers only.');
};

// Check if user is a buyer
exports.isBuyer = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'buyer') {
    return next();
  }
  res.status(403).send('Access denied. Buyers only.');
};

// Check if user is NOT authenticated (for login/register pages)
exports.isGuest = (req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  // Redirect to their dashboard
  const role = req.session.user.role;
  res.redirect(`/${role}/dashboard`);
};

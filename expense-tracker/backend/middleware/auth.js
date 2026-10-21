const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function authenticate(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = /^Bearer\s+(\S+)$/i.exec(authorization);

  if (!match) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'Authentication is not configured' });
  }

  try {
    const payload = jwt.verify(match[1], process.env.JWT_SECRET);
    if (
      !payload ||
      typeof payload !== 'object' ||
      typeof payload.id !== 'string' ||
      !/^[a-f\d]{24}$/i.test(payload.id)
    ) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findById(payload.id).select('_id name email');
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Authentication required' });
    }
    return next(error);
  }
};

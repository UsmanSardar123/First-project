const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function auth(req, res, next) {
  const authorization = req.get('Authorization');
  const match = authorization && authorization.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      message:
        'Authentication is not configured. Set JWT_SECRET in the backend environment and restart the server.',
    });
  }

  let payload;
  try {
    payload = jwt.verify(match[1], process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  let user;
  try {
    user = await User.findById(payload.id).select(
      '_id name email provider avatar'
    );
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    return res.status(500).json({ message: 'Authentication failed' });
  }

  if (!user) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  req.user = user;
  return next();
};

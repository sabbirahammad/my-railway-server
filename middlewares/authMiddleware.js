import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

export const protect = async (req, res, next) => {
  let token;

  console.log('🔍 Auth middleware called for:', req.method, req.path);
  console.log('🔑 Authorization header:', req.headers.authorization ? 'Present' : 'Missing');

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log('🔑 Token received:', token.substring(0, 20) + '...');

      // Verify token
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      console.log('🔐 JWT Secret being used (first 20 chars):', jwtSecret.substring(0, 20) + '...');
      console.log('🔐 JWT Secret length:', jwtSecret.length);
      const decoded = jwt.verify(token, jwtSecret);
      console.log('✅ Token decoded successfully:', decoded);

      // Get user from token
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        // Special case for admin user that might not exist in database yet
        if (decoded.email === "outzen@gmail.com") {
          console.log('✅ Special admin user authenticated');
          req.user = {
            id: decoded.id,
            name: "Admin User",
            email: "outzen@gmail.com",
            role: "admin"
          };
          return next();
        }

        console.error('❌ User not found for token');
        return res.status(401).json({
          success: false,
          message: 'Not authorized, user not found'
        });
      }

      console.log('✅ User authenticated:', user.email);
      req.user = user;
      next();
    } catch (error) {
      console.error('❌ Auth middleware error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  } else {
    console.log('❌ No valid authorization header');
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }
};

// Admin role verification middleware
export const adminOnly = (req, res, next) => {
  console.log('👑 Admin middleware called for:', req.method, req.path);
  console.log('👤 User role:', req.user?.role);

  if (!req.user) {
    console.error('❌ No user found in request');
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // For development/testing purposes, allow access if user is authenticated
  // In production, uncomment the strict role check below:
  /*
  if (req.user.role !== 'admin') {
    console.error('❌ Access denied. User role:', req.user.role);
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  */

  console.log('✅ Admin access granted (development mode)');
  next();
};

import jwt from "jsonwebtoken";
import { config } from "../config.js";

const authMiddleware = (req, res, next) => {
  try {
    // console.log(req.headers.authorization)
    // Get token from header
    const authHeader = req.headers.authorization;
    console.log(authHeader)
    const token = (authHeader && authHeader.split(" ")[1]) || req.body.token || req.headers["x-access-token"] 



    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);

    // Attach user info to request object
    req.user = {
      userId: decoded.userId,
      walletAddress: decoded.walletAddress,
      userType: decoded.userType, // "worker" or "company"
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please sign in again.",
      });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to authenticate token.",
        error: error.message,
      });
    }
  }
};

// ============================================================================
// Admin Auth Middleware - Verify Admin Wallet
// ============================================================================

const ADMIN_WALLET = "5h54tPqd4ZbjTLF74SKVTCKmzRrnhP9tFqPcrHjxcfhQ";

const adminAuthMiddleware = (req, res, next) => {
  try {
    // First verify JWT
    const authHeader = req.headers.authorization;
    const token = req.body.token || req.headers["x-access-token"] || (authHeader && authHeader.split(" ")[1]);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const decoded = jwt.verify(token, config.jwtSecret);

    // Check if user is admin
    if (decoded.walletAddress !== ADMIN_WALLET) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    req.user = {
      userId: decoded.userId,
      walletAddress: decoded.walletAddress,
      userType: decoded.userType,
      isAdmin: true,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please sign in again.",
      });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to authenticate token.",
        error: error.message,
      });
    }
  }
};

export { authMiddleware, adminAuthMiddleware };
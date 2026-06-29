import jwt from "jsonwebtoken";
import { config } from "../config.js";

const authMiddleware = (req, res, next) => {
  try {
   
    // Get token from header
    const authHeader = req.headers.authorization;
    
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
      // Worker JWTs are signed with `publicKey`, company JWTs with `walletAddress`
      walletAddress: decoded.walletAddress || decoded.publicKey,
      userType: decoded.userType,
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

// ⚠️  TEMP: swapped to local dev key — revert to 5h54tPqd4ZbjTLF74SKVTCKmzRrnhP9tFqPcrHjxcfhQ before final review
const ADMIN_WALLET = "5h54tPqd4ZbjTLF74SKVTCKmzRrnhP9tFqPcrHjxcfhQ";

const adminAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = req.body.token || req.headers["x-access-token"] || (authHeader && authHeader.split(" ")[1]);

    if (!token) {
      return res.status(401).json({ success: false, message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, config.jwtSecret);

    // Must be admin role AND the correct wallet
    if (decoded.role !== "admin" || decoded.walletAddress !== ADMIN_WALLET) {
      return res.status(403).json({ success: false, message: "Access denied. Admin privileges required." });
    }

    req.user = {
      walletAddress: decoded.walletAddress,
      role: "admin",
      isAdmin: true,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired. Please sign in again." });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token." });
    } else {
      return res.status(500).json({ success: false, message: "Failed to authenticate token.", error: error.message });
    }
  }
};


export { authMiddleware, adminAuthMiddleware };
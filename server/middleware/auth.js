import User from "../models/user.js";
import jwt from "jsonwebtoken";

// Middleware to protect routes
export const protectRoute = async (req, res, next) => {
  try {
    // Check both 'token' header and 'Authorization' header
    let token = req.headers.token;
    
    if (!token && req.headers.authorization) {
      token = req.headers.authorization.replace('Bearer ', '');
    }
    
    if (!token) {
      return res.json({success: false, message: "jwt must be provided"});
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    
    if (!user) {
      return res.json({success: false, message: "User not found"});
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.log(error.message);
    res.json({success: false, message: error.message});
  }
};
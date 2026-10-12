import jwt from "jsonwebtoken";


// Authentication middleware
// Reads JWT from HttpOnly cookie, verifies it, and sets req.userId
const authMiddleware = (req, res, next) => {
  try {
    // 1. Read token from cookie
    const token = req.cookies.token;

    // 2. Check if token exists
    if (!token) {
      return res.status(401).json({
        message: "Please login first",
      });
    }

    // 3. Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Get userId from token and put it on the request
    req.userId = decoded.userId;

    // 5. Continue to next middleware/controller
    next();
  } catch (error) {
    // Invalid or expired token
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

export default authMiddleware;
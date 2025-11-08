const jwt = require("jsonwebtoken");
require("dotenv").config(); // Ensure environment variables are loaded

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined. Check your .env file!");
}

const fetchuser = (req, res, next) => {
  const token = req.header("auth-token"); // Ensure frontend sends "auth-token" correctly

  if (!token) {
    console.log("Token not found");
    return res
      .status(401)
      .json({ error: "Authentication failed: No token provided" });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded.user; // Attach user data to request object
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error.message);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token format" });
    }

    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: "Token expired, please log in again" });
    }

    return res.status(401).json({ error: "Authentication failed" });
  }
};

module.exports = fetchuser;

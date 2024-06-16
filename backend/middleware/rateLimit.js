const rateLimit = require("express-rate-limit");

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 login requests per windowMs
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
  handler: (req, res, /*next*/) => {
    res.status(429).json({
      success: false,
      message: "Too many login attempts. Please try again later.",
    });
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

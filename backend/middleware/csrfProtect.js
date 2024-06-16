// csrfMiddleware.js
const csrf = require("csurf");
const cookieParser = require("cookie-parser");

// Setup cookie parser middleware (if not already done)
const csrfProtection = csrf({ cookie: true });

module.exports = {
  csrfProtection,
  cookieParser,
};

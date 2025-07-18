// Simple logging middleware
const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress;

  console.log(`[${timestamp}] ${method} ${url} - ${ip}`);

  // Log request body for POST/PUT requests (excluding file uploads)
  if ((method === 'POST' || method === 'PUT') && !req.is('multipart/form-data')) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }

  next();
};

module.exports = logger;
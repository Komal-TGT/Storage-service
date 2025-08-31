// Simple API-key auth. Replace with JWT/OAuth if needed.
const allowedKeys = (process.env.API_KEYS || '').split(',').map(s => s.trim()).filter(Boolean);

function apiKeyAuth(req, res, next) {
  if (!allowedKeys.length) return next(); // dev mode
  const key = req.header('x-api-key');
  if (!key || !allowedKeys.includes(key)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

module.exports = { apiKeyAuth };

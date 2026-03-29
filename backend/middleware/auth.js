import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'delhi-air-quality-secret-2024';

export function authenticateUser(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Access denied. Please log in.' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. Invalid token format.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

export function authorizeGov(req, res, next) {
  authenticateUser(req, res, () => {
    if (req.user && req.user.type === 'gov') {
      next();
    } else {
      res.status(403).json({ error: 'Government clearance required.' });
    }
  });
}

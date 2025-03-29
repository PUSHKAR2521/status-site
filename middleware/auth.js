const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {
    const token = req.cookies.adminToken || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (error) {
        res.clearCookie('adminToken'); // Clear invalid cookie
        res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = adminAuth;
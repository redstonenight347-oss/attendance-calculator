import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        // Enforce ownership: prevent User A from accessing/mutating User B's resources
        const targetUserId = req.params.id || req.params.userID;
        if (targetUserId !== undefined) {
            if (Number(decoded.id) !== Number(targetUserId)) {
                return res.status(403).json({ message: 'Access forbidden: You do not own this resource' });
            }
        }

        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

const Employee = require('../models/employeeSchema');
const { COOKIE_NAME, verifyToken, clearTokenCookie } = require('../utils/token');

const attachUser = async (req, res, next) => {
    req.user = null;
    res.locals.currentUser = null;

    const token = req.cookies[COOKIE_NAME];
    if (!token) {
        return next();
    }

    let payload;
    try {
        payload = verifyToken(token);
    } catch {
        clearTokenCookie(res);
        return next();
    }

    try {
        const user = await Employee.findByPk(payload.userId);
        if (user) {
            req.user = user;
            res.locals.currentUser = user;
        } else {
            clearTokenCookie(res);
        }
        next();
    } catch (error) {
        next(error);
    }
};


// GUARD 1: must be logged in
const requireLogin = (req, res, next) => {
    if (!req.user) {
        return res.redirect('/login'); 
    }
    next();
}

// GUARD 2: function to check for admin
const requireAdmin=(req, res, next)=> {
    if (!req.user) {
        return res.redirect('/login');
    }
    if (req.user.role !== 'admin') {  // 'role' is the column we added; 'admin' is OUR word
        return res.status(403).send('403 Forbidden: admins only.');
    }
    next();
}

// GUARD 3: to check if the person editing is the person itself or the admin
const requireSelfOrAdmin = (req, res, next)=> {
    if (!req.user) {
        return res.redirect('/login');
    }
    const isSelf = String(req.user.id) === String(req.params.id);
    const isAdmin = req.user.role === 'admin';
    if (!isSelf && !isAdmin) {
        return res.status(403).send('403 Forbidden: you can edit .');
    }
    next();
}


//redirector function
const redirectIfLoggedIn = (req, res, next)=> {
    if (req.user) {
        return res.redirect('/employees');
    }
    next();
}

module.exports = {
    attachUser, requireLogin, requireAdmin, requireSelfOrAdmin, redirectIfLoggedIn
};

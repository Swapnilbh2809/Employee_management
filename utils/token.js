const jwt = require('jsonwebtoken')
const COOKIE_NAME = 'employee.token'
const TOKEN_TTL_SECONDS = 60 * 60 * 2
const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
    httpOnly: true,
    samSite: 'lax',
    secure: isProduction
}
const signToken = (user) => {
    return jwt.sign(
        { userId: user.id },                  
        process.env.JWT_SECRET,              
        { algorithm: 'HS256', expiresIn: TOKEN_TTL_SECONDS }
    );
}
const verifyToken = (token) => {
    return jwt.verify(
        token,
        process.env.JWT_SECRET,
        { algorithms: ['HS256'] }
    )
}
const setTokenCookie = (res, user) => {

    res.cookie(COOKIE_NAME, signToken(user), {
        ...cookieOptions,
        maxAge: TOKEN_TTL_SECONDS * 1000    
    });
}

const clearTokenCookie= (res)=> {
  res.clearCookie(COOKIE_NAME, cookieOptions);
}

module.exports = { COOKIE_NAME, verifyToken, setTokenCookie, clearTokenCookie };
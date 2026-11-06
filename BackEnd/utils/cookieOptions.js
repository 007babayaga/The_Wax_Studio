const isProd = process.env.NODE_ENV === "production";

// One set of attributes for setting AND clearing. Browsers ignore a clear
// whose SameSite/Secure don't match the cookie, so logout would silently
// fail in production (cross-site, SameSite=None) if these drifted apart.
const baseCookieOptions = () => ({
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'None' : 'Lax',
    path: '/'
});

module.exports = { baseCookieOptions };

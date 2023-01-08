const path = require('path');

module.exports = function ensureLoggedIn(options) {
    if (!options.role) {
        throw new Error("role option is required");
    }
    if (typeof options == 'string') {
        options = { redirectTo: options }
    }
    options = options || {};

    return function (req, res, next) {
        if (!req.isAuthenticated || !(req.isAuthenticated() && req?.user?.role == options.role)) {

            let url = (options.redirectTo instanceof Function ? options.redirectTo() : options.redirectTo) || '/login';
            let setReturnTo = (options.setReturnTo === undefined) ? true : options.setReturnTo;

            if (setReturnTo && req.session) {
                req.session.returnTo = req.originalUrl || req.url;
            }
            return res.redirect(url);
        }
        next();
    }
}

const express = require('express');
const { authRouter } = require('./v1/Auth/routes');
const { otpRouter } = require('./v1/Otp/routes');
const { adminRouter } = require('./v1/Admin/routes');
const rateLimit = require('express-rate-limit');


const apiRouter = express.Router({ caseSensitive: true });

apiRouter.use('/auth',authRouter)
apiRouter.use('/otp',otpRouter)
apiRouter.use('/admin',adminRouter)

module.exports={apiRouter}
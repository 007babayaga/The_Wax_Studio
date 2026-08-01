const express = require('express');
const { authRouter } = require('./v1/Auth/routes');
const { otpRouter } = require('./v1/Otp/routes');


const apiRouter = express.Router();

apiRouter.use('/auth',authRouter)
apiRouter.use('/otp',otpRouter)

module.exports={apiRouter}
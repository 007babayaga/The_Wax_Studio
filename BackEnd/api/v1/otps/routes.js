const express = require('express');
const { validatePhoneNumberforOtp } = require('./dto');
const { sendOtpController } = require('./controllers');

const otpRouter = express.Router();

otpRouter.post("/phone",validatePhoneNumberforOtp,sendOtpController)

module.exports={otpRouter}


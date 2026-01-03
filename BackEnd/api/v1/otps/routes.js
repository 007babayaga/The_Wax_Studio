const express = require('express');
const { validatePhoneNumberforOtp, validateEmailforOtp } = require('./dto');
const { sendOtpController, sendOtpToEmailController } = require('./controllers');

const otpRouter = express.Router();

otpRouter.post("/phone",validatePhoneNumberforOtp,sendOtpController)
otpRouter.post("/email",validateEmailforOtp,sendOtpToEmailController)

module.exports={otpRouter}


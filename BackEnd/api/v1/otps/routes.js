const express = require('express');
const { validatePhoneNumberforOtp, validateEmailforOtp, validateOtpVerification } = require('./dto');
const { sendOtpController, sendOtpToEmailController, otpVerificationController } = require('./controllers');

const otpRouter = express.Router();

otpRouter.post("/phone",validatePhoneNumberforOtp,sendOtpController)
otpRouter.post("/email",validateEmailforOtp,sendOtpToEmailController)
otpRouter.post("/verify",validateOtpVerification,otpVerificationController)

module.exports={otpRouter}


const express = require('express')
const { validateUserEmail } = require('./dto')
const { sendOtpController, resendOtpController, verifyEmailOtpController } = require('./controller')

const otpRouter  = express.Router()

otpRouter.post('/toEmail',validateUserEmail,sendOtpController)
otpRouter.post('/resendOtpToEmail',resendOtpController)
otpRouter.post('/verifyEmailOtp',verifyEmailOtpController)

module.exports={otpRouter}
const express = require('express');
const { validateUserSignUp, validateUserLogin, validateForgotPassword, validateResetPassword } = require('./dto');
const { userSignUpController, googleAuthController, userLoginController, refreshTokenController, userLogoutController, authStatusController, forgotPasswordController, resetPasswordController } = require('./controllers');
const { tokenVerificaionMiddleware } = require('../../../TokenMiddleware/TokenVerifierMiddleware');

const authRouter = express.Router({ caseSensitive: true });

authRouter.post('/signUp', validateUserSignUp, userSignUpController);
authRouter.post('/google',googleAuthController);
authRouter.post('/userLogin',validateUserLogin,userLoginController);
authRouter.post('/userLogout',tokenVerificaionMiddleware,userLogoutController);
authRouter.post('/forgotPassword',validateForgotPassword,forgotPasswordController)
authRouter.post('/resetPassword',validateResetPassword,resetPasswordController)
authRouter.get('/userStatus',tokenVerificaionMiddleware,authStatusController);
authRouter.post('/refreshToken',refreshTokenController)



module.exports={authRouter};
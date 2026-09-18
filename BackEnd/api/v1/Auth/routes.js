const express = require('express');
const { validateUserSignUp, validateUserLogin } = require('./dto');
const { userSignUpController, googleAuthController, userLoginController, refreshTokenController, userLogoutController, authStatusController } = require('./controllers');
const { tokenVerificaionMiddleware } = require('../../../TokenMiddleware/TokenVerifierMiddleware');

const authRouter = express.Router({ caseSensitive: true });

authRouter.post('/signUp', validateUserSignUp, userSignUpController);
authRouter.post('/google',googleAuthController);
authRouter.post('/userLogin',validateUserLogin,userLoginController);
authRouter.post('/userLogout',tokenVerificaionMiddleware,userLogoutController);
authRouter.get('/userStatus',tokenVerificaionMiddleware,authStatusController);
authRouter.post('/refreshToken',refreshTokenController)



module.exports={authRouter};
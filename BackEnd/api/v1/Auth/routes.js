const express = require('express');
const { validateUserSignUp, validateUserLogin } = require('./dto');
const { userSignUpController, googleAuthController, userLoginController } = require('./controllers');

const authRouter = express.Router({ caseSensitive: true });

authRouter.post('/signUp', validateUserSignUp, userSignUpController);
authRouter.post('/google',googleAuthController);
authRouter.post('/userLogin',validateUserLogin,userLoginController);



module.exports={authRouter};
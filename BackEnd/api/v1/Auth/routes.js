const express = require('express');
const multer = require('multer');
const { validateUserSignUp, validateUserLogin, validateForgotPassword, validateResetPassword } = require('./dto');
const { userSignUpController, googleAuthController, userLoginController, refreshTokenController, userLogoutController, authStatusController, forgotPasswordController, resetPasswordController, uploadProfilePictureController, updateProfileController, deleteAccountController } = require('./controllers');
const { tokenVerificaionMiddleware } = require('../../../TokenMiddleware/TokenVerifierMiddleware');

const authRouter = express.Router({ caseSensitive: true });

const profilePictureUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
            return cb(new Error('Only JPG, PNG or WEBP images are allowed'));
        }
        cb(null, true);
    },
}).single('profilePicture');

// Turns multer errors (too large, wrong type) into a 400 JSON response
// instead of Express's default HTML error page.
const handleProfilePictureUpload = (req, res, next) => {
    profilePictureUpload(req, res, (err) => {
        if (!err) return next();

        const message = err.code === 'LIMIT_FILE_SIZE'
            ? 'Profile photo must be 2 MB or smaller'
            : err.message || 'Invalid profile photo';
        return res.status(400).json({ isSuccess: false, message });
    });
};

authRouter.post('/signUp', validateUserSignUp, userSignUpController);
authRouter.post('/google',googleAuthController);
authRouter.post('/userLogin',validateUserLogin,userLoginController);
authRouter.post('/userLogout',tokenVerificaionMiddleware,userLogoutController);
authRouter.post('/forgotPassword',validateForgotPassword,forgotPasswordController)
authRouter.post('/resetPassword',validateResetPassword,resetPasswordController)
authRouter.get('/userStatus',tokenVerificaionMiddleware,authStatusController);
authRouter.post('/refreshToken',refreshTokenController)
authRouter.put('/profilePicture',tokenVerificaionMiddleware,handleProfilePictureUpload,uploadProfilePictureController)
authRouter.put('/profile',tokenVerificaionMiddleware,updateProfileController)
authRouter.post('/deleteAccount',tokenVerificaionMiddleware,deleteAccountController)



module.exports={authRouter};

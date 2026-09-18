const express = require('express');
const multer = require('multer');
const { isAuthenticated, isAdmin } = require('./dto');
const { addProductController, getProductsController, editProductController, deleteProductController } = require('./controller');

const adminRouter = express.Router();
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error('Only image files are allowed'));
        }

        cb(null, true);
    },
});

adminRouter.post('/addProduct', isAuthenticated, isAdmin, upload.single('image'), addProductController);
adminRouter.get('/getProducts',isAuthenticated, isAdmin,getProductsController)
adminRouter.put('/editProduct/:productId', isAuthenticated, isAdmin, upload.single('image'), editProductController);
adminRouter.delete('/editProduct/:productId', isAuthenticated, isAdmin, deleteProductController);

module.exports={adminRouter}
const test = require('node:test');
const assert = require('node:assert/strict');

const cloudinary = require('cloudinary').v2;
const controller = require('../api/v1/Admin/controller.js');
const productModel = require('../models/productSchema.js');

const makeRes = () => ({
    statusCode: 200,
    payload: null,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(payload) {
        this.payload = payload;
        return this;
    },
});

test('addProductController rejects missing auth', async () => {
    const res = makeRes();

    await controller.addProductController({ user: null }, res);

    assert.equal(res.statusCode, 401);
    assert.equal(res.payload.isSuccess, false);
    assert.match(res.payload.message, /Authentication required/i);
});

test('addProductController rejects missing image', async () => {
    const res = makeRes();

    await controller.addProductController({ user: { _id: '64b7b25e9f8d9f0f3ce2c5b1' } }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.payload.isSuccess, false);
    assert.match(res.payload.message, /Product image is required/i);
});

test('editProductController rejects invalid product id', async () => {
    const res = makeRes();

    await controller.editProductController({ params: { productId: 'bad-id' }, body: {} }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.payload.isSuccess, false);
    assert.match(res.payload.message, /Invalid product id/i);
});

test('deleteProductController rejects invalid product id', async () => {
    const res = makeRes();

    await controller.deleteProductController({ params: { productId: 'bad-id' } }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.payload.isSuccess, false);
    assert.match(res.payload.message, /Invalid product id/i);
});

test('addProductController returns 409 on duplicate SKU', async () => {
    const originalCreate = productModel.ProductModel.create;
    const originalUpload = cloudinary.uploader.upload_stream;

    cloudinary.uploader.upload_stream = (options, callback) => ({
        end: (buffer) => callback(null, { secure_url: 'https://example.com/test.jpg' }),
    });

    productModel.ProductModel.create = async () => {
        const err = new Error('duplicate key');
        err.code = 11000;
        throw err;
    };

    const res = makeRes();
    await controller.addProductController({
        user: { _id: '64b7b25e9f8d9f0f3ce2c5b1' },
        file: { buffer: Buffer.from('fake-image') },
        body: {
            name: 'Candle',
            description: 'Nice candle',
            price: 12,
            category: 'Aroma',
            sku: 'ABC-1',
            scent: 'Vanilla',
            waxType: 'Soy',
            weight: 200,
            stock: 10,
            burnTime: 25,
        },
    }, res);

    assert.equal(res.statusCode, 409);
    assert.equal(res.payload.isSuccess, false);
    assert.match(res.payload.message, /already exists/i);

    cloudinary.uploader.upload_stream = originalUpload;
    productModel.ProductModel.create = originalCreate;
});
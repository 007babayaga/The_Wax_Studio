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

test('editProductController saves catalog fields and retained gallery images', async () => {
    const originalFindById = productModel.ProductModel.findById;
    let saveCount = 0;
    const product = {
        _id: '64b7b25e9f8d9f0f3ce2c5b1',
        name: 'Old Candle',
        description: 'Old description',
        price: 20,
        offerPrice: 10,
        category: 'Old category',
        sku: 'OLD-1',
        scent: 'Old scent',
        waxType: 'Soy',
        weight: 200,
        stock: 5,
        burnTime: 20,
        color: 'white',
        isActive: true,
        tags: [],
        series: '',
        slug: '',
        images: ['https://example.com/old.jpg'],
        imageUrl: 'https://example.com/old.jpg',
        metaData: {},
        variants: [],
        save: async () => {
            saveCount += 1;
        },
    };

    productModel.ProductModel.findById = async () => product;

    try {
        const res = makeRes();
        await controller.editProductController({
            params: { productId: product._id },
            body: {
                name: 'Updated Candle',
                slug: 'updated-candle',
                series: 'Botanical Reserve',
                offerPrice: '',
                isActive: 'false',
                tags: 'hand-poured,clean burn',
                metaData: JSON.stringify({
                    title: 'Updated SEO Title',
                    keywords: ['soy wax', 'handmade'],
                }),
                retainedImages: JSON.stringify([
                    'https://example.com/retained.jpg',
                ]),
            },
        }, res);

        assert.equal(res.statusCode, 200);
        assert.equal(product.name, 'Updated Candle');
        assert.equal(product.slug, 'updated-candle');
        assert.equal(product.series, 'Botanical Reserve');
        assert.equal(product.offerPrice, null);
        assert.equal(product.isActive, false);
        assert.deepEqual(product.tags, ['hand-poured', 'clean burn']);
        assert.deepEqual(product.metaData, {
            title: 'Updated SEO Title',
            keywords: ['soy wax', 'handmade'],
        });
        assert.deepEqual(product.images, ['https://example.com/retained.jpg']);
        assert.equal(product.imageUrl, 'https://example.com/retained.jpg');
        assert.equal(saveCount, 1);
    } finally {
        productModel.ProductModel.findById = originalFindById;
    }
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

test('addProductController saves a gallery and product series', async () => {
    const originalCreate = productModel.ProductModel.create;
    const originalUpload = cloudinary.uploader.upload_stream;
    const uploadedProduct = {};
    let uploadCount = 0;

    cloudinary.uploader.upload_stream = (options, callback) => ({
        end: () => {
            uploadCount += 1;
            callback(null, { secure_url: `https://example.com/image-${uploadCount}.jpg` });
        },
    });

    productModel.ProductModel.create = async (payload) => {
        Object.assign(uploadedProduct, payload);
        return payload;
    };

    try {
        const res = makeRes();
        await controller.addProductController({
            user: { _id: '64b7b25e9f8d9f0f3ce2c5b1' },
            files: [
                { buffer: Buffer.from('primary-image') },
                { buffer: Buffer.from('gallery-image') },
            ],
            body: {
                name: 'Candle',
                description: 'Nice candle',
                price: 12,
                category: 'Scented Candles',
                series: 'Botanical Reserve 2025',
                sku: 'ABC-2',
                scent: 'Vanilla',
                waxType: 'Soy',
                weight: 200,
                stock: 10,
                burnTime: 25,
                isActive: 'false',
            },
        }, res);

        assert.equal(res.statusCode, 201);
        assert.equal(uploadedProduct.imageUrl, 'https://example.com/image-1.jpg');
        assert.deepEqual(uploadedProduct.images, [
            'https://example.com/image-1.jpg',
            'https://example.com/image-2.jpg',
        ]);
        assert.equal(uploadedProduct.series, 'Botanical Reserve 2025');
        assert.equal(uploadedProduct.isActive, false);
    } finally {
        cloudinary.uploader.upload_stream = originalUpload;
        productModel.ProductModel.create = originalCreate;
    }
});

test('addProductController rejects an invalid active state', async () => {
    const res = makeRes();

    await controller.addProductController({
        user: { _id: '64b7b25e9f8d9f0f3ce2c5b1' },
        file: { buffer: Buffer.from('fake-image') },
        body: {
            name: 'Candle',
            description: 'Nice candle',
            price: 12,
            category: 'Aroma',
            sku: 'ABC-3',
            scent: 'Vanilla',
            waxType: 'Soy',
            weight: 200,
            isActive: 'sometimes',
        },
    }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.payload.isSuccess, false);
    assert.match(res.payload.message, /active state must be true or false/i);
});
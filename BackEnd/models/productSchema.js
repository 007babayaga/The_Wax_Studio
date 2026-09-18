const mongoose = require("mongoose");

const { Schema, model } = mongoose;

const addProductSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        offerPrice: {
            type: Number,
            default: null,
            min: 0,
            validate: {
                validator: function (value) {
                    if (value === null || value === undefined) return true;
                    return value <= this.price;
                },
                message: "offerPrice cannot be greater than price",
            },
        },
        category: {
            type: String,
            required: true,
            trim: true,
        },
        sku: {
            type: String,
            unique: true,
            required: true,
            trim: true,
            uppercase: true,
        },
        scent: {
            type: String,
            required: true,
            trim: true,
        },
        burnTime: {
            type: Number, // in hours
            default: 0,
            min: 0,
        },
        waxType: {
            type: String, // Soy, Beeswax, Paraffin
            required: true,
            trim: true,
        },
        weight: {
            type: Number, // grams
            required: true,
            min: 0,
        },
        color: {
            type: String, // candle color
            default: "white",
            trim: true,
        },
        tags: [{ type: String, trim: true, lowercase: true }],
        imageUrl: {
            type: String,
            required: true,
        },
        images: [{ type: String }],
        stock: {
            type: Number,
            default: 0,
            min: 0,
        },
        ratings: {
            average: { type: Number, default: 0, min: 0, max: 5 },
            count: { type: Number, default: 0, min: 0 },
        },
        variants: [
            {
                type: { type: String },
                value: { type: String },
            },
        ],
        isActive: {
            type: Boolean,
            default: true,
        },
        metaData: {
            title: { type: String, trim: true },
            keywords: [{ type: String, trim: true, lowercase: true }],
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

// Indexes for performance
addProductSchema.index({ category: 1, isActive: 1 });
addProductSchema.index({ name: "text", description: "text", scent: "text" });

const ProductModel = model("Product", addProductSchema);

module.exports = { ProductModel };

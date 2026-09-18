const mongoose = require("mongoose");
const { v2: cloudinary } = require("cloudinary");
const { ProductModel } = require("../../../models/productSchema");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const parseJsonField = (value, fallback = []) => {
    if (!value) return fallback;
    if (typeof value === "object") return value;

    try {
        return JSON.parse(value);
    } catch (e) {
        return fallback;
    }
};

const normalizeTags = (tags) => {
    if (Array.isArray(tags)) {
        return tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean);
    }

    if (typeof tags === "string") {
        return tags
            .split(",")
            .map((tag) => tag.trim().toLowerCase())
            .filter(Boolean);
    }

    return [];
};

const getSafeNumber = (value, fieldName, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, allowZero = true } = {}) => {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        throw new Error(`${fieldName} must be a valid number`);
    }

    if (parsed < min || parsed > max || (!allowZero && parsed === 0)) {
        throw new Error(`${fieldName} is out of allowed range`);
    }

    return parsed;
};

const validateProductPayload = (body) => {
    const {
        name,
        description,
        price,
        category,
        sku,
        scent,
        waxType,
        weight,
        offerPrice,
        stock,
        burnTime,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
        throw new Error("Product name is required");
    }

    if (!description || typeof description !== "string" || !description.trim()) {
        throw new Error("Product description is required");
    }

    if (!category || typeof category !== "string" || !category.trim()) {
        throw new Error("Product category is required");
    }

    if (!sku || typeof sku !== "string" || !sku.trim()) {
        throw new Error("Product SKU is required");
    }

    if (!scent || typeof scent !== "string" || !scent.trim()) {
        throw new Error("Product scent is required");
    }

    if (!waxType || typeof waxType !== "string" || !waxType.trim()) {
        throw new Error("Product wax type is required");
    }

    const parsedPrice = getSafeNumber(price, "price", { min: 0.01, max: 1000000 });
    const parsedWeight = getSafeNumber(weight, "weight", { min: 0.01, max: 100000 });
    const parsedStock = stock === undefined ? 0 : getSafeNumber(stock, "stock", { min: 0, max: 1000000 });
    const parsedBurnTime = burnTime === undefined ? 0 : getSafeNumber(burnTime, "burnTime", { min: 0, max: 100000 });

    let parsedOfferPrice = null;
    if (offerPrice !== undefined && offerPrice !== null && offerPrice !== "") {
        parsedOfferPrice = getSafeNumber(offerPrice, "offerPrice", { min: 0, max: 1000000 });

        if (parsedOfferPrice > parsedPrice) {
            throw new Error("Offer price cannot be greater than price");
        }
    }

    return {
        name: name.trim(),
        description: description.trim(),
        price: parsedPrice,
        offerPrice: parsedOfferPrice,
        category: category.trim(),
        sku: sku.trim().toUpperCase(),
        scent: scent.trim(),
        burnTime: parsedBurnTime,
        waxType: waxType.trim(),
        weight: parsedWeight,
        color: body.color ? String(body.color).trim() : "white",
        tags: normalizeTags(body.tags),
        stock: parsedStock,
        variants: parseJsonField(body.variants, []),
        metaData: parseJsonField(body.metaData, {}),
    };
};

const addProductController = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                isSuccess: false,
                message: "Authentication required",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                isSuccess: false,
                message: "Product image is required",
            });
        }

        const validatedPayload = validateProductPayload(req.body);

        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: "products", resource_type: "image" },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );

            stream.end(req.file.buffer);
        });

        const product = await ProductModel.create({
            ...validatedPayload,
            imageUrl: uploadResult.secure_url,
            images: [uploadResult.secure_url],
            createdBy: req.user._id,
        });

        return res.status(201).json({
            isSuccess: true,
            message: "Product added successfully",
            product,
        });
    } catch (err) {
        console.log("---Error in addProductController---", err.message);

        const statusCode = err.message.includes("required") || err.message.includes("must be") || err.message.includes("range") || err.message.includes("greater") ? 400 : 500;

        return res.status(statusCode).json({
            isSuccess: false,
            message: statusCode === 400 ? err.message : "Internal server Error",
        });
    }
};

const getProductsController = async (req, res) => {
    try {
        console.log("----------------Inside getProductsController----------------");

        const search = (req.query.search || "").trim();
        const filter = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { sku: { $regex: search, $options: "i" } },
                { scent: { $regex: search, $options: "i" } },
                { category: { $regex: search, $options: "i" } },
            ];
        }

        const products = await ProductModel.find(filter).sort({ createdAt: -1 });

        return res.status(200).json({
            isSuccess: true,
            message: "Products fetched successfully",
            products,
        });
    } catch (err) {
        console.log("-----Error in getProductsController------", err.message);
        return res.status(500).json({
            isSuccess: false,
            message: "Internal Server Error",
        });
    }
};

const editProductController = async (req, res) => {
    try {
        console.log("---------Inside editProductController--------------");

        const { productId } = req.params;

        if (!isValidObjectId(productId)) {
            return res.status(400).json({
                isSuccess: false,
                message: "Invalid product id",
            });
        }

        const product = await ProductModel.findById(productId);

        if (!product) {
            return res.status(404).json({
                isSuccess: false,
                message: "Product not found",
            });
        }

        const incoming = req.body;

        if (incoming.name !== undefined) {
            if (typeof incoming.name !== "string" || !incoming.name.trim()) {
                return res.status(400).json({ isSuccess: false, message: "Product name is invalid" });
            }
            product.name = incoming.name.trim();
        }

        if (incoming.description !== undefined) {
            if (typeof incoming.description !== "string" || !incoming.description.trim()) {
                return res.status(400).json({ isSuccess: false, message: "Product description is invalid" });
            }
            product.description = incoming.description.trim();
        }

        if (incoming.price !== undefined) {
            product.price = getSafeNumber(incoming.price, "price", { min: 0.01, max: 1000000 });
        }

        if (incoming.offerPrice !== undefined && incoming.offerPrice !== null && incoming.offerPrice !== "") {
            const offerPrice = getSafeNumber(incoming.offerPrice, "offerPrice", { min: 0, max: 1000000 });

            if (offerPrice > product.price) {
                return res.status(400).json({
                    isSuccess: false,
                    message: "Offer price cannot be greater than price",
                });
            }

            product.offerPrice = offerPrice;
        }

        if (incoming.category !== undefined) {
            if (typeof incoming.category !== "string" || !incoming.category.trim()) {
                return res.status(400).json({ isSuccess: false, message: "Product category is invalid" });
            }
            product.category = incoming.category.trim();
        }

        if (incoming.sku !== undefined) {
            if (typeof incoming.sku !== "string" || !incoming.sku.trim()) {
                return res.status(400).json({ isSuccess: false, message: "Product SKU is invalid" });
            }
            product.sku = incoming.sku.trim().toUpperCase();
        }

        if (incoming.scent !== undefined) {
            if (typeof incoming.scent !== "string" || !incoming.scent.trim()) {
                return res.status(400).json({ isSuccess: false, message: "Product scent is invalid" });
            }
            product.scent = incoming.scent.trim();
        }

        if (incoming.burnTime !== undefined) {
            product.burnTime = getSafeNumber(incoming.burnTime, "burnTime", { min: 0, max: 100000 });
        }

        if (incoming.waxType !== undefined) {
            if (typeof incoming.waxType !== "string" || !incoming.waxType.trim()) {
                return res.status(400).json({ isSuccess: false, message: "Product wax type is invalid" });
            }
            product.waxType = incoming.waxType.trim();
        }

        if (incoming.weight !== undefined) {
            product.weight = getSafeNumber(incoming.weight, "weight", { min: 0.01, max: 100000 });
        }

        if (incoming.color !== undefined) {
            product.color = String(incoming.color).trim() || "white";
        }

        if (incoming.tags !== undefined) {
            product.tags = normalizeTags(incoming.tags);
        }

        if (incoming.stock !== undefined) {
            product.stock = getSafeNumber(incoming.stock, "stock", { min: 0, max: 1000000 });

            if (product.stock <= 0) {
                product.isActive = false;
            } else {
                product.isActive = true;
            }
        }

        if (incoming.variants !== undefined) {
            product.variants = parseJsonField(incoming.variants, []);
        }

        if (incoming.metaData !== undefined) {
            product.metaData = parseJsonField(incoming.metaData, {});
        }

        if (req.file) {
            const uploadResult = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "products", resource_type: "image" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                stream.end(req.file.buffer);
            });

            product.imageUrl = uploadResult.secure_url;
            product.images = [uploadResult.secure_url];
        }

        await product.save();

        return res.status(200).json({
            isSuccess: true,
            message: "Product updated successfully",
            product,
        });
    } catch (err) {
        console.log("---Error in editProductController---", err.message);

        const statusCode = err.message.includes("must be") || err.message.includes("invalid") || err.message.includes("greater") || err.message.includes("Invalid") ? 400 : 500;

        return res.status(statusCode).json({
            isSuccess: false,
            message: statusCode === 400 ? err.message : "Internal Server Error",
        });
    }
};

const deleteProductController = async (req, res) => {
    try {
        console.log("---------Inside deleteProductController--------------");

        const { productId } = req.params;

        if (!isValidObjectId(productId)) {
            return res.status(400).json({
                isSuccess: false,
                message: "Invalid product id",
            });
        }

        const product = await ProductModel.findById(productId);
        if (!product) {
            return res.status(404).json({
                isSuccess: false,
                message: "Product not found",
            });
        }

        product.isActive = false;
        await product.save();

        return res.status(200).json({
            isSuccess: true,
            message: "Product deactivated successfully",
            product,
        });
    } catch (err) {
        console.log("---Error in deleteProductController---", err.message);
        return res.status(500).json({
            isSuccess: false,
            message: "Internal Server Error",
        });
    }
};

module.exports = { addProductController, getProductsController, editProductController, deleteProductController };
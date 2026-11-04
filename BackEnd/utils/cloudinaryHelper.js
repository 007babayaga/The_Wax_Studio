const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

// Streams an in-memory file (multer memoryStorage) to Cloudinary.
const uploadImageBuffer = (buffer, options = {}) =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { resource_type: "image", ...options },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        stream.end(buffer);
    });

const deleteImage = (publicId) =>
    cloudinary.uploader.destroy(publicId, { resource_type: "image" });

module.exports = { uploadImageBuffer, deleteImage };

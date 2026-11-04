import { api } from "./Api.js";

// Image uploads (up to 8 x 5 MB, then Cloudinary) need far longer than 15s.
const UPLOAD_TIMEOUT_MS = 120000;

//get products
const getProducts = ({ search } = {}, options = {}) =>
    api.get("/admin/getProducts", { search: search || undefined }, options);
//get single product
const getProduct = (productId, options = {}) =>
    api.get(`/admin/getProduct/${encodeURIComponent(productId)}`, {}, options);
//add products
const addProduct = (formData, options = {}) =>
    api.post("/admin/addProduct", formData, {
        timeout: UPLOAD_TIMEOUT_MS,
        ...options,
    });
//deactivate Product
const deactivateProduct = (productId, options = {}) =>
    api.delete(`/admin/editProduct/${encodeURIComponent(productId)}`, options);

//edit Product
const editProduct = (productId, body, options = {}) =>
    api.put(
        `/admin/editProduct/${encodeURIComponent(productId)}`,
        body,
        { timeout: UPLOAD_TIMEOUT_MS, ...options }
    );

export { getProducts, getProduct, addProduct, deactivateProduct ,editProduct   };
import { api } from "./Api.js";

//get products
const getProducts = ({ search } = {}, options = {}) =>
    api.get("/admin/getProducts", { search: search || undefined }, options);
//add products
const addProduct = (formData, options = {}) =>
    api.post("/admin/addProduct", formData, options);
//deactivate Product
const deactivateProduct = (productId, options = {}) =>
    api.delete(`/admin/editProduct/${encodeURIComponent(productId)}`, options);

//edit Product
const editProduct = (productId, body, options = {}) =>
    api.put(
        `/admin/editProduct/${encodeURIComponent(productId)}`,
        body,
        options
    );

export { getProducts, addProduct, deactivateProduct ,editProduct   };
// Grouped for <optgroup>; the option value is the category name saved on the product.
export const PRODUCT_CATEGORY_GROUPS = [
    {
        label: "Candles",
        categories: [
            "Premium Candles",
            "Shot Glass Candles",
            "Pillar Candles",
            "Taper Jar Candles",
            "Floating Candles",
            "Ribbed Jar Candles",
            "Lantern Candles",
            "Votive Candles",
            "Tin Candles",
            "Unscented Tea Lights",
            "Scented Tea Lights",
            "Diyas",
            "Glass Candles",
        ],
    },
    {
        label: "Other",
        categories: [
            "Scented Candles",
            "Wax Melts",
            "Home Fragrance",
            "Accessories",
        ],
    },
];

export const PRODUCT_CATEGORIES = PRODUCT_CATEGORY_GROUPS.flatMap(
    (group) => group.categories
);

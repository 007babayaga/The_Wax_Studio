import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "react-toastify";
import {
    FiCheck,
    FiCopy,
    FiImage,
    FiRefreshCw,
    FiX,
} from "react-icons/fi";

import {
    editProduct,
    getProducts,
} from "../../Services/AdminService.js";
import { getErrorMessage } from "../../Services/Api.js";
import { ROUTES } from "../../constants/routes.js";
import {
    PRODUCT_CATEGORIES,
    PRODUCT_CATEGORY_GROUPS,
} from "../../constants/productCategories.js";
import masterPhoto from "../../assets/admin/064cf.png";
import galleryPhotoOne from "../../assets/admin/f3662.png";
import galleryPhotoTwo from "../../assets/admin/cc294.png";
import photographyTipIcon from "../../assets/admin/3fcc5.svg";
import chevronIcon from "../../assets/admin/3d151.svg";
import plusIcon from "../../assets/admin/0e93d.svg";
import seoIcon from "../../assets/admin/e001e.svg";
import currencyIcon from "../../assets/admin/7dfac.svg";

const MAX_IMAGES = 8;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const LOW_STOCK_THRESHOLD = 10;

const inputClassName =
    "h-10 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 text-xs text-[#111827] outline-none transition placeholder:text-[#94A3B8] focus:border-[#947359] focus:ring-2 focus:ring-[#947359]/15";

const FieldLabel = ({ htmlFor, children, required = false }) => (
    <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold text-[#475569]"
    >
        {children}
        {required && <span className="ml-1 text-[#FF8D28]">*</span>}
    </label>
);

const slugify = (value) =>
    value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

const readImage = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
            resolve({
                file,
                previewUrl: String(reader.result),
                id: `${file.name}-${file.lastModified}-${file.size}`,
            });
        reader.onerror = () =>
            reject(reader.error ?? new Error(`Could not read ${file.name}.`));
        reader.readAsDataURL(file);
    });

const EditProduct = () => {
    const navigate = useNavigate();
    const { productId } = useParams();
    const fileInputRef = useRef(null);
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [slugIsManual, setSlugIsManual] = useState(false);
    const [images, setImages] = useState([]);
    const [newImages, setNewImages] = useState([]);
    const [tagInput, setTagInput] = useState("");
    const [form, setForm] = useState({
        name: "",
        slug: "",
        description: "",
        category: "",
        series: "",
        sku: "",
        price: "",
        offerPrice: "",
        scent: "",
        waxType: "",
        weight: "",
        stock: "",
        burnTime: "",
        color: "",
        isActive: true,
        metaTitle: "",
        metaKeywords: "",
    });

    useEffect(() => {
        const controller = new AbortController();
        let isCurrent = true;

        const loadProduct = async () => {
            try {
                const response = await getProducts({}, {
                    signal: controller.signal,
                });
                const foundProduct = Array.isArray(response?.products)
                    ? response.products.find(
                          (item) => String(item._id) === String(productId)
                      )
                    : null;

                if (!isCurrent) return;
                if (!foundProduct) {
                    setError("Product not found.");
                    return;
                }

                const metadata = foundProduct.metaData ?? {};
                const existingImages = Array.isArray(foundProduct.images)
                    ? foundProduct.images.filter(Boolean)
                    : [];
                if (
                    existingImages.length === 0 &&
                    foundProduct.imageUrl
                ) {
                    existingImages.push(foundProduct.imageUrl);
                }

                setProduct(foundProduct);
                setImages(existingImages);
                setForm({
                    name: foundProduct.name ?? "",
                    slug:
                        foundProduct.slug || slugify(foundProduct.name ?? ""),
                    description: foundProduct.description ?? "",
                    category: foundProduct.category ?? "",
                    series: foundProduct.series ?? "",
                    sku: foundProduct.sku ?? "",
                    price: foundProduct.price ?? "",
                    offerPrice: foundProduct.offerPrice ?? "",
                    scent: foundProduct.scent ?? "",
                    waxType: foundProduct.waxType ?? "",
                    weight: foundProduct.weight ?? "",
                    stock: foundProduct.stock ?? 0,
                    burnTime: foundProduct.burnTime ?? "",
                    color: foundProduct.color ?? "",
                    isActive: foundProduct.isActive !== false,
                    metaTitle: metadata.title ?? "",
                    metaKeywords: Array.isArray(metadata.keywords)
                        ? metadata.keywords.join(", ")
                        : "",
                });
            } catch (requestError) {
                if (isCurrent && requestError?.name !== "AbortError") {
                    setError(getErrorMessage(requestError));
                }
            } finally {
                if (isCurrent) setLoading(false);
            }
        };

        loadProduct();
        return () => {
            isCurrent = false;
            controller.abort();
        };
    }, [productId]);

    const updateField = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({
            ...current,
            [name]: value,
            ...(name === "name" && !slugIsManual
                ? { slug: slugify(value) }
                : {}),
        }));
    };

    const addImages = async (incomingFiles) => {
        const validFiles = Array.from(incomingFiles).filter((file) => {
            if (
                ![
                    "image/jpeg",
                    "image/png",
                    "image/webp",
                    "image/gif",
                ].includes(file.type)
            ) {
                toast.error(`${file.name} is not a supported image format.`);
                return false;
            }
            if (file.size > MAX_FILE_SIZE) {
                toast.error(`${file.name} exceeds the 5 MB image limit.`);
                return false;
            }
            return true;
        });
        const availableSlots = MAX_IMAGES - images.length - newImages.length;

        if (validFiles.length > availableSlots) {
            toast.error(`You can add up to ${MAX_IMAGES} product images.`);
        }
        if (availableSlots <= 0) return;

        try {
            const previews = await Promise.all(
                validFiles.slice(0, availableSlots).map(readImage)
            );
            setNewImages((current) => [...current, ...previews]);
        } catch (readError) {
            toast.error(
                readError instanceof Error
                    ? readError.message
                    : "Could not read the selected image."
            );
        }
    };

    const removeExistingImage = (imageIndex) => {
        setImages((current) =>
            current.filter((_, index) => index !== imageIndex)
        );
    };

    const removeNewImage = (imageId) => {
        setNewImages((current) =>
            current.filter((image) => image.id !== imageId)
        );
    };

    const addTag = () => {
        const tag = tagInput.trim();
        const currentTags = Array.isArray(product?.tags)
            ? product.tags
            : product?.tags?.split(",").filter(Boolean) ?? [];
        const tags = product ? currentTags : [];
        const normalizedTag = tag.toLowerCase();
        if (
            !tag ||
            tags.some((existingTag) => existingTag.toLowerCase() === normalizedTag)
        ) {
            return;
        }

        setProduct((current) => ({
            ...current,
            tags: [...(Array.isArray(current?.tags) ? current.tags : []), tag],
        }));
        setTagInput("");
    };

    const removeTag = (tagToRemove) => {
        setProduct((current) => ({
            ...current,
            tags: (Array.isArray(current?.tags) ? current.tags : []).filter(
                (tag) => tag !== tagToRemove
            ),
        }));
    };

    const handleTagKeyDown = (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            addTag();
        }
    };

    const copySlug = async () => {
        try {
            await navigator.clipboard.writeText(
                `https://thewaxstudio.com/products/${form.slug}`
            );
            toast.success("Product link copied.");
        } catch {
            toast.error("Could not copy the product link.");
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!product) return;
        if (images.length + newImages.length === 0) {
            toast.error("A product must have at least one image.");
            return;
        }
        if (
            form.offerPrice !== "" &&
            Number(form.offerPrice) > Number(form.price)
        ) {
            toast.error("Offer price cannot be greater than retail price.");
            return;
        }

        setIsSaving(true);
        const payload = new FormData();
        Object.entries({
            name: form.name.trim(),
            slug: form.slug.trim(),
            description: form.description.trim(),
            category: form.category.trim(),
            series: form.series.trim(),
            sku: form.sku.trim(),
            price: form.price,
            offerPrice: form.offerPrice,
            scent: form.scent.trim(),
            waxType: form.waxType.trim(),
            weight: form.weight,
            stock: form.stock,
            burnTime: form.burnTime || 0,
            color: form.color.trim() || "white",
            isActive: String(form.isActive),
            tags: (Array.isArray(product.tags) ? product.tags : []).join(","),
            variants: JSON.stringify(product.variants ?? []),
            metaData: JSON.stringify({
                title: form.metaTitle.trim(),
                keywords: form.metaKeywords
                    .split(",")
                    .map((keyword) => keyword.trim())
                    .filter(Boolean),
            }),
            retainedImages: JSON.stringify(images),
        }).forEach(([key, value]) => payload.append(key, value));
        newImages.forEach(({ file }) => payload.append("images", file));

        try {
            await editProduct(productId, payload);
            toast.success("Product updated successfully.");
            navigate(ROUTES.ADMIN_PRODUCTS);
        } catch (requestError) {
            toast.error(
                getErrorMessage(requestError, "Could not update this product.")
            );
        } finally {
            setIsSaving(false);
        }
    };

    const tags = Array.isArray(product?.tags) ? product.tags : [];
    const totalImages = images.length + newImages.length;
    const heroImage =
        images[0] ?? newImages[0]?.previewUrl ?? masterPhoto;
    const burnEstimate = form.weight
        ? `${Math.max(1, Math.round(Number(form.weight) / 4))} – ${Math.max(
              2,
              Math.round(Number(form.weight) / 3.6)
          )} Hours`
        : "Calculated from net weight";
    const previewTitle =
        form.metaTitle.trim() ||
        `${form.name || "Product"}${
            form.waxType ? ` | ${form.waxType}` : ""
        } — TheWax Studio`;
    const previewDescription =
        form.description.trim() ||
        "Add a product description to preview the search listing.";

    if (loading) {
        return (
            <p role="status" className="py-12 text-center text-sm text-[#64748B]">
                Loading product…
            </p>
        );
    }

    if (error || !product) {
        return (
            <section className="rounded-xl border border-[#E5E7EB] bg-white p-6">
                <p role="alert" className="text-sm text-red-700">
                    {error || "Product not found."}
                </p>
                <button
                    type="button"
                    onClick={() => navigate(ROUTES.ADMIN_PRODUCTS)}
                    className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
                >
                    Back to Products
                </button>
            </section>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,407fr)_minmax(0,689fr)]">
                <section className="rounded-xl bg-white p-5 shadow-[0_1px_1.5px_rgba(0,0,0,0.2)] xl:min-h-179">
                    <div className="mb-3 flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                        <div>
                            <h1 className="text-xl leading-5 font-semibold text-[#111827]">
                                Media &amp; Gallery
                                <span className="text-[#FF8D28]">*</span>
                            </h1>
                            <p className="mt-0.5 text-xs leading-4 text-[#94A3B8]">
                                Manage photography and carousel order
                            </p>
                        </div>
                        <span className="flex h-[21px] min-w-[81px] items-center justify-center rounded bg-[#F2F2F7] px-2 text-[10px] text-[#64748B]">
                            {totalImages} of {MAX_IMAGES} images
                        </span>
                    </div>

                    <div className="relative h-[260px] overflow-hidden rounded-xl bg-[#F8FAFC] sm:h-[346px]">
                        <img
                            src={heroImage}
                            alt={`${form.name} primary product image`}
                            onError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = masterPhoto;
                            }}
                            className="absolute left-[-41.76%] top-0 h-full w-[183.51%] max-w-none"
                        />
                        <span className="absolute left-3 top-3 rounded-md bg-black px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white">
                            Primary Cover Shot
                        </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                        <h2 className="text-xs font-semibold text-[#111827]">
                            Gallery Shots
                        </h2>
                        <span className="text-[11px] text-[#94A3B8]">
                            {totalImages} slots assigned
                        </span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-3 pl-[6.5px]">
                        {images.length === 0 && newImages.length === 0 && (
                            <>
                                {[galleryPhotoOne, galleryPhotoTwo].map(
                                    (image, index) => (
                                        <div
                                            key={image}
                                            className="relative h-[88px] w-[88px] overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] sm:h-[110px] sm:w-[110px]"
                                        >
                                            <img
                                                src={image}
                                                alt={`Example product gallery image ${index + 1}`}
                                                className="absolute left-[-41.76%] top-0 h-full w-[183.51%] max-w-none"
                                            />
                                            <span className="absolute left-1.5 top-1.5 rounded bg-[#0F172A]/80 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                                EXAMPLE
                                            </span>
                                        </div>
                                    )
                                )}
                            </>
                        )}
                        {images.map((image, index) => (
                            <div
                                key={`${image}-${index}`}
                                className="group relative h-[88px] w-[88px] overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] sm:h-[110px] sm:w-[110px]"
                            >
                                <img
                                    src={image}
                                    alt={`${form.name} gallery image ${index + 1}`}
                                    onError={(event) => {
                                        event.currentTarget.onerror = null;
                                        event.currentTarget.src = masterPhoto;
                                    }}
                                    className="absolute left-[-41.76%] top-0 h-full w-[183.51%] max-w-none"
                                />
                                {index === 0 && (
                                    <span className="absolute left-1.5 top-1.5 rounded bg-[#0F172A]/80 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                        COVER
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => removeExistingImage(index)}
                                    aria-label={`Remove gallery image ${index + 1}`}
                                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-red-600 shadow-sm"
                                >
                                    <FiX aria-hidden="true" />
                                </button>
                            </div>
                        ))}
                        {newImages.map((image, index) => (
                            <div
                                key={image.id}
                                className="group relative h-[88px] w-[88px] overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] sm:h-[110px] sm:w-[110px]"
                            >
                                <img
                                    src={image.previewUrl}
                                    alt={`${form.name} new gallery image ${index + 1}`}
                                    className="absolute left-[-41.76%] top-0 h-full w-[183.51%] max-w-none"
                                />
                                {images.length === 0 && index === 0 && (
                                    <span className="absolute left-1.5 top-1.5 rounded bg-[#0F172A]/80 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                        COVER
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => removeNewImage(image.id)}
                                    aria-label={`Remove new gallery image ${index + 1}`}
                                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-red-600 shadow-sm"
                                >
                                    <FiX aria-hidden="true" />
                                </button>
                            </div>
                        ))}
                        {totalImages < MAX_IMAGES && (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex h-[88px] w-[88px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#947359] text-[#947359] transition hover:bg-[#947359]/5 sm:h-[110px] sm:w-[110px]"
                            >
                                <FiImage aria-hidden="true" />
                                <span className="text-[10px]">Add Image</span>
                            </button>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        onChange={(event) => {
                            void addImages(event.target.files);
                            event.target.value = "";
                        }}
                        className="sr-only"
                        aria-label="Add product gallery images"
                    />
                    <div className="mt-3 flex gap-2.5 rounded-lg border border-[#947359] bg-amber-50/10 px-[15px] pt-[15px] pb-[13px] text-[11px] leading-[19.5px] text-[#564338]">
                        <img
                            src={photographyTipIcon}
                            alt=""
                            aria-hidden="true"
                            className="mt-0.5 h-4 w-4 shrink-0"
                        />
                        <p className="min-w-0">

                            <span className="font-semibold">
                                Pro Recommendation:
                            </span>
                            <br />
                            High-res PNG, JPG or WebP (optimal 1200×1200px
                            square). Crisp studio photography with warm natural
                            lighting boosts storefront conversion rates by up
                            to 28%.
                        </p>
                    </div>
                </section>

                <section className="rounded-xl bg-white p-5 shadow-[0_1px_1.5px_rgba(0,0,0,0.2)] xl:min-h-179">
                    <div className="mb-3 border-b border-[#F1F5F9] pb-3">
                        <h2 className="text-xl leading-5 font-semibold text-[#111827]">
                            General Information
                        </h2>
                        <p className="mt-0.5 text-xs leading-4 text-[#94A3B8]">
                            Core customer-facing catalog details and taxonomy
                        </p>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <FieldLabel htmlFor="edit-product-title" required>
                                Product Title
                            </FieldLabel>
                            <div className="relative mt-1.5">
                                <input
                                    id="edit-product-title"
                                    name="name"
                                    value={form.name}
                                    onChange={updateField}
                                    maxLength={120}
                                    required
                                    className={`${inputClassName} pr-10`}
                                />
                                <FiCheck className="absolute right-3 top-3 text-emerald-500" />
                            </div>
                        </div>
                        <div>
                            <FieldLabel htmlFor="edit-product-slug" required>
                                Product Slug / Permalinks
                            </FieldLabel>
                            <div className="mt-1.5 flex overflow-hidden rounded-md border border-[#E2E8F0] bg-[#F8FAFC]">
                                <span className="flex shrink-0 items-center border-r border-[#CBD5E1] bg-[#ECEEF0] px-3 text-[10px] text-[#4B5563] sm:text-xs">
                                    thewaxstudio.com/products/
                                </span>
                                <input
                                    id="edit-product-slug"
                                    name="slug"
                                    value={form.slug}
                                    onChange={(event) => {
                                        setSlugIsManual(true);
                                        updateField(event);
                                    }}
                                    required
                                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-xs text-[#111827] outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={copySlug}
                                    aria-label="Copy product permalink"
                                    className="px-3 text-[#475569] hover:text-black"
                                >
                                    <FiCopy aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                        <div>
                            <div className="mb-1.5 flex items-center justify-between">
                                <FieldLabel
                                    htmlFor="edit-product-description"
                                    required
                                >
                                    Description
                                </FieldLabel>
                                <span className="text-[11px] text-[#94A3B8]">
                                    {form.description.length}/500
                                </span>
                            </div>
                            <textarea
                                id="edit-product-description"
                                name="description"
                                value={form.description}
                                onChange={updateField}
                                maxLength={500}
                                required
                                className="h-[178px] w-full resize-y rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs leading-5 text-[#111827] outline-none focus:border-[#947359] focus:ring-2 focus:ring-[#947359]/15"
                            />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <FieldLabel htmlFor="edit-product-category" required>
                                    Primary Category
                                </FieldLabel>
                                <div className="relative mt-1.5">
                                    <select
                                        id="edit-product-category"
                                        name="category"
                                        value={form.category}
                                        onChange={updateField}
                                        required
                                        className={`${inputClassName} appearance-none pr-9`}
                                    >
                                        <option value="" disabled>
                                            Select a category
                                        </option>
                                        {!PRODUCT_CATEGORIES.includes(form.category) &&
                                            form.category && (
                                                <option value={form.category}>
                                                    {form.category}
                                                </option>
                                            )}
                                        {PRODUCT_CATEGORY_GROUPS.map((group) => (
                                            <optgroup
                                                key={group.label}
                                                label={group.label}
                                            >
                                                {group.categories.map((category) => (
                                                    <option
                                                        key={category}
                                                        value={category}
                                                    >
                                                        {category}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 -rotate-90">
                                        <img
                                            src={chevronIcon}
                                            alt=""
                                            aria-hidden="true"
                                        />
                                    </span>
                                </div>
                            </div>
                            <div>
                                <FieldLabel htmlFor="edit-product-series">
                                    Atelier Series / Collection
                                </FieldLabel>
                                <div className="relative mt-1.5">
                                    <select
                                        id="edit-product-series"
                                        name="series"
                                        value={form.series}
                                        onChange={updateField}
                                        className={`${inputClassName} appearance-none pr-9`}
                                    >
                                        <option value="">Select a series</option>
                                        {![
                                            "Botanical Reserve 2025",
                                            "Signature Collection",
                                            "Seasonal Editions",
                                        ].includes(form.series) &&
                                            form.series && (
                                                <option value={form.series}>
                                                    {form.series}
                                                </option>
                                            )}
                                        <option value="Botanical Reserve 2025">
                                            Botanical Reserve 2025
                                        </option>
                                        <option value="Signature Collection">
                                            Signature Collection
                                        </option>
                                        <option value="Seasonal Editions">
                                            Seasonal Editions
                                        </option>
                                    </select>
                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 -rotate-90">
                                        <img
                                            src={chevronIcon}
                                            alt=""
                                            aria-hidden="true"
                                        />
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-[#F1F5F9] pt-2">
                            <FieldLabel htmlFor="edit-product-tags">
                                Tags &amp; Taxonomy
                            </FieldLabel>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                {tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="inline-flex items-center gap-1.5 rounded-md border border-[#E2E8F0]/70 bg-[#F2F2F7] px-2.5 py-1 text-xs text-[#111827]"
                                    >
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => removeTag(tag)}
                                            aria-label={`Remove ${tag} tag`}
                                            className="text-[#64748B] hover:text-red-600"
                                        >
                                            <FiX aria-hidden="true" />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    id="edit-product-tags"
                                    value={tagInput}
                                    onChange={(event) =>
                                        setTagInput(event.target.value)
                                    }
                                    onKeyDown={handleTagKeyDown}
                                    placeholder="Add a tag"
                                    className="h-8 min-w-28 flex-1 rounded-md border border-[#E2E8F0] px-2 text-xs outline-none focus:border-[#947359]"
                                />
                                <button
                                    type="button"
                                    onClick={addTag}
                                    className="inline-flex h-8 items-center gap-2 rounded-md bg-black px-3 text-xs font-semibold text-white"
                                >
                                    <img src={plusIcon} alt="" aria-hidden="true" />
                                    Add Tag
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <section className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)] sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 text-sm font-bold text-[#191C1E]">
                        <img src={seoIcon} alt="" aria-hidden="true" />
                        Search Engine Listing Preview
                    </h2>
                    <span className="rounded-sm bg-[#ECFDF5] px-2 py-0.5 font-mono text-[11px] text-[#047857]">
                        Indexable
                    </span>
                </div>
                <div className="space-y-0.5 rounded border border-[#ECEEF0] bg-[#F7F9FB] p-3">
                    <p className="break-all text-xs text-[#565E74]">
                        https://thewaxstudio.com › products ›{" "}
                        {form.slug || "product-slug"}
                    </p>
                    <p className="truncate text-sm font-semibold text-[#1A0DAB]">
                        {previewTitle}
                    </p>
                    <p className="text-xs leading-4 text-[#564338]">
                        {previewDescription}
                    </p>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                        <FieldLabel htmlFor="edit-meta-title">
                            Search Listing Title
                        </FieldLabel>
                        <input
                            id="edit-meta-title"
                            value={form.metaTitle}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    metaTitle: event.target.value,
                                }))
                            }
                            maxLength={160}
                            placeholder="Optional SEO title"
                            className={`${inputClassName} mt-1.5`}
                        />
                    </div>
                    <div>
                        <FieldLabel htmlFor="edit-meta-keywords">
                            Search Keywords
                        </FieldLabel>
                        <input
                            id="edit-meta-keywords"
                            value={form.metaKeywords}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    metaKeywords: event.target.value,
                                }))
                            }
                            placeholder="vanilla, soy wax, handmade"
                            className={`${inputClassName} mt-1.5`}
                        />
                    </div>
                </div>
            </section>

            <section className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)] sm:p-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[#F1F5F9] pb-3">
                    <div>
                        <h2 className="text-xl font-semibold text-[#111827]">
                            Product Specifications &amp; Stock
                        </h2>
                        <p className="text-xs text-[#94A3B8]">
                            Manage warehouse identification, olfactory profile,
                            pricing, and fulfillment parameters.
                        </p>
                    </div>
                    <span className="flex items-center gap-1.5 rounded border border-[#E2E8F0]/60 bg-[#F2F2F7] px-2.5 py-1.5 text-[11px] text-[#475569]">
                        <img src={currencyIcon} alt="" aria-hidden="true" />
                        Unit currency: INR (₹)
                    </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div>
                        <FieldLabel htmlFor="edit-product-sku" required>
                            SKU Code
                        </FieldLabel>
                        <input
                            id="edit-product-sku"
                            name="sku"
                            value={form.sku}
                            onChange={updateField}
                            maxLength={40}
                            required
                            className={`${inputClassName} mt-1.5 uppercase`}
                        />
                    </div>
                    <div>
                        <FieldLabel htmlFor="edit-product-price" required>
                            Retail Price
                        </FieldLabel>
                        <div className="relative mt-1.5">
                            <span className="absolute left-3 top-2.5 text-xs text-[#64748B]">
                                ₹
                            </span>
                            <input
                                id="edit-product-price"
                                name="price"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={form.price}
                                onChange={updateField}
                                required
                                className={`${inputClassName} pl-8 pr-16`}
                            />
                            <span className="absolute right-2 top-2 rounded bg-[#F2F2F7] px-1.5 py-0.5 text-[10px] text-[#64748B]">
                                Incl. Tax
                            </span>
                        </div>
                    </div>
                    <div>
                        <FieldLabel htmlFor="edit-product-scent" required>
                            Scent Profile
                        </FieldLabel>
                        <input
                            id="edit-product-scent"
                            name="scent"
                            value={form.scent}
                            onChange={updateField}
                            required
                            className={`${inputClassName} mt-1.5`}
                        />
                    </div>
                    <div>
                        <FieldLabel htmlFor="edit-product-wax-type" required>
                            Wax Formulation
                        </FieldLabel>
                        <input
                            id="edit-product-wax-type"
                            name="waxType"
                            value={form.waxType}
                            onChange={updateField}
                            required
                            className={`${inputClassName} mt-1.5`}
                        />
                    </div>
                    <div>
                        <FieldLabel htmlFor="edit-product-weight" required>
                            Net Weight (g)
                        </FieldLabel>
                        <input
                            id="edit-product-weight"
                            name="weight"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={form.weight}
                            onChange={updateField}
                            required
                            className={`${inputClassName} mt-1.5`}
                        />
                    </div>
                    <div>
                        <FieldLabel htmlFor="edit-product-stock" required>
                            Stock Quantity
                        </FieldLabel>
                        <div className="relative mt-1.5">
                            <input
                                id="edit-product-stock"
                                name="stock"
                                type="number"
                                min="0"
                                step="1"
                                value={form.stock}
                                onChange={updateField}
                                required
                                className={`${inputClassName} pr-24`}
                            />
                            <span
                                className={`absolute right-2 top-2 rounded px-2 py-1 text-[10px] font-semibold ${
                                    Number(form.stock) <= LOW_STOCK_THRESHOLD
                                        ? "bg-amber-50 text-amber-700"
                                        : "bg-emerald-50 text-emerald-700"
                                }`}
                            >
                                ●{" "}
                                {Number(form.stock) <= LOW_STOCK_THRESHOLD
                                    ? "Low Stock"
                                    : "In Stock"}
                            </span>
                        </div>
                    </div>
                    <div>
                        <FieldLabel htmlFor="edit-product-offer-price">
                            Offer Price
                        </FieldLabel>
                        <div className="relative mt-1.5">
                            <span className="absolute left-3 top-2.5 text-xs text-[#64748B]">
                                ₹
                            </span>
                            <input
                                id="edit-product-offer-price"
                                name="offerPrice"
                                type="number"
                                min="0"
                                max={form.price || undefined}
                                step="0.01"
                                value={form.offerPrice}
                                onChange={updateField}
                                className={`${inputClassName} pl-8`}
                            />
                        </div>
                    </div>
                    <div>
                        <FieldLabel htmlFor="edit-product-burn-time">
                            Burn Time (hours)
                        </FieldLabel>
                        <input
                            id="edit-product-burn-time"
                            name="burnTime"
                            type="number"
                            min="0"
                            value={form.burnTime}
                            onChange={updateField}
                            className={`${inputClassName} mt-1.5`}
                        />
                    </div>
                    <div>
                        <FieldLabel htmlFor="edit-product-color">
                            Product Color
                        </FieldLabel>
                        <input
                            id="edit-product-color"
                            name="color"
                            value={form.color}
                            onChange={updateField}
                            className={`${inputClassName} mt-1.5`}
                        />
                    </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <article className="rounded-xl border border-[#E7EDF5] bg-[#F8FAFC] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">
                            Burn Time Est.
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#111827]">
                            {form.burnTime
                                ? `${form.burnTime} Hours`
                                : burnEstimate}
                        </p>
                        <p className="mt-1 text-[11px] text-[#64748B]">
                            Calculated from {form.weight || 0}g net weight
                        </p>
                    </article>
                    <article className="rounded-xl border border-[#E7EDF5] bg-[#F8FAFC] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">
                            Inventory Threshold
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#111827]">
                            Low stock alert at {LOW_STOCK_THRESHOLD}
                        </p>
                        <p className="mt-1 text-[11px] text-[#64748B]">
                            Auto-dispatches restock notice
                        </p>
                    </article>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E7EDF5] bg-[#F8FAFC] p-4">
                        <input
                            type="checkbox"
                            name="isActive"
                            checked={form.isActive}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    isActive: event.target.checked,
                                }))
                            }
                            className="h-4 w-4 accent-[#947359]"
                        />
                        <span>
                            <span className="block text-sm font-semibold text-[#111827]">
                                Active Product
                            </span>
                            <span className="text-[11px] text-[#64748B]">
                                Available in the product catalog
                            </span>
                        </span>
                    </label>
                </div>
            </section>

            <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
                <button
                    type="button"
                    onClick={() => navigate(ROUTES.ADMIN_PRODUCTS)}
                    disabled={isSaving}
                    className="rounded-lg border border-[#CBD5E1] bg-white px-5 py-2.5 text-sm font-semibold text-[#475569] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#292929] disabled:cursor-wait disabled:opacity-60 cursor-pointer"
                >
                    {isSaving && (
                        <FiRefreshCw className="animate-spin" aria-hidden="true" />
                    )}
                    {isSaving ? "Saving Changes…" : "Save Changes"}
                </button>
            </div>
        </form>
    );
};

export { EditProduct };

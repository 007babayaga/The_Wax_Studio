import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "../../utils/toast.js";
import {
    FiChevronDown,
    FiClock,
    FiHash,
    FiPlus,
    FiRefreshCw,
    FiSun,
    FiUploadCloud,
    FiX,
} from "react-icons/fi";

import { addProduct } from "../../Services/AdminService.js";
import { getErrorMessage } from "../../Services/Api.js";
import { ROUTES } from "../../constants/routes.js";
import { PRODUCT_CATEGORY_GROUPS } from "../../constants/productCategories.js";
import galleryExampleOne from "../../assets/admin/product-gallery-example-1.jpeg";
import galleryExampleTwo from "../../assets/admin/product-gallery-example-2.jpeg";
import galleryExampleThree from "../../assets/admin/product-gallery-example-3.jpeg";

const MAX_IMAGES = 8;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const LOW_STOCK_THRESHOLD = 10;
const galleryExamples = [
    galleryExampleOne,
    galleryExampleTwo,
    galleryExampleThree,
];

const inputClassName =
    "h-10 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 text-xs text-[#111827] outline-none transition placeholder:text-[#94A3B8] focus:border-[#957358] focus:ring-2 focus:ring-[#957358]/15";

const FieldLabel = ({ htmlFor, children, required = false }) => (
    <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold text-[#475569]"
    >
        {children}
        {required && <span className="ml-1 text-[#FF8D28]">*</span>}
    </label>
);

const ImageThumbnail = ({ file, index, onRemove }) => {
    const [previewUrl, setPreviewUrl] = useState("");

    useEffect(() => {
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    return (
        <div className="group relative aspect-square overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
            {previewUrl && (
                <img
                    src={previewUrl}
                    alt={`Product gallery image ${index + 1}`}
                    className="h-full w-full object-cover"
                />
            )}
            {index === 0 && (
                <span className="absolute left-2 top-2 rounded bg-[#1F2937]/85 px-2 py-1 text-[10px] font-semibold text-white">
                    COVER
                </span>
            )}
            <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={`Remove image ${index + 1}`}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-[#DC2626] opacity-100 shadow-sm transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"
            >
                <FiX aria-hidden="true" />
            </button>
        </div>
    );
};

const AddProduct = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [images, setImages] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [tagInput, setTagInput] = useState("");
    const [tags, setTags] = useState([]);
    const [form, setForm] = useState({
        name: "",
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
        color: "white",
        isActive: true,
    });
    const [variants, setVariants] = useState([]);
    const [variantType, setVariantType] = useState("");
    const [variantValue, setVariantValue] = useState("");
    const [metaTitle, setMetaTitle] = useState("");
    const [metaKeywords, setMetaKeywords] = useState("");

    const updateField = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    };

    const addImages = (incomingFiles) => {
        const selectedFiles = Array.from(incomingFiles);
        const validFiles = selectedFiles.filter((file) => {
            const isImage = [
                "image/jpeg",
                "image/png",
                "image/webp",
                "image/gif",
            ].includes(file.type);

            if (!isImage) {
                toast.error(`${file.name} is not a supported image format.`);
                return false;
            }

            if (file.size > MAX_FILE_SIZE) {
                toast.error(`${file.name} exceeds the 5 MB image limit.`);
                return false;
            }

            return true;
        });

        const remainingSlots = MAX_IMAGES - images.length;
        if (validFiles.length > remainingSlots) {
            toast.error(`You can add up to ${MAX_IMAGES} product images.`);
        }

        const newImages = validFiles
            .slice(0, Math.max(0, remainingSlots))
            .map((file) => ({ id: crypto.randomUUID(), file }));
        setImages((current) => [...current, ...newImages].slice(0, MAX_IMAGES));
    };

    const removeImage = (indexToRemove) => {
        setImages((current) =>
            current.filter((_, index) => index !== indexToRemove)
        );
    };

    // Commas are the separator sent to the backend, so "a, b" adds two tags.
    const addTag = () => {
        const seen = new Set(tags.map((tag) => tag.toLowerCase()));
        const newTags = [];
        let hadDuplicate = false;

        tagInput
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
            .forEach((tag) => {
                if (seen.has(tag.toLowerCase())) {
                    hadDuplicate = true;
                    return;
                }
                seen.add(tag.toLowerCase());
                newTags.push(tag);
            });

        if (hadDuplicate) {
            toast.info("That tag has already been added.");
        }

        setTags((current) => [...current, ...newTags]);
        setTagInput("");
    };

    const handleTagKeyDown = (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            addTag();
        }
    };

    const generateSku = () => {
        const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
        setForm((current) => ({ ...current, sku: `WS-${suffix}` }));
    };

    const addVariant = () => {
        const type = variantType.trim();
        const value = variantValue.trim();
        if (!type || !value) return;

        setVariants((current) => [...current, { type, value }]);
        setVariantType("");
        setVariantValue("");
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setIsDragging(false);
        addImages(event.dataTransfer.files);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (images.length === 0) {
            toast.error("Add at least one product image.");
            return;
        }

        setIsSaving(true);
        const payload = new FormData();
        Object.entries(form).forEach(([key, value]) => payload.append(key, value));
        if (!form.burnTime && burnEstimateRange) {
            payload.set("burnTime", burnEstimateRange.min);
        }
        payload.append("tags", tags.join(","));
        payload.append("variants", JSON.stringify(variants));
        payload.append(
            "metaData",
            JSON.stringify({
                title: metaTitle.trim(),
                keywords: metaKeywords
                    .split(",")
                    .map((keyword) => keyword.trim())
                    .filter(Boolean),
            })
        );
        images.forEach(({ file }) => payload.append("images", file));

        try {
            await addProduct(payload);
            toast.success("Product added successfully.");
            navigate(ROUTES.ADMIN_PRODUCTS);
        } catch (error) {
            toast.error(getErrorMessage(error, "Could not add this product."));
        } finally {
            setIsSaving(false);
        }
    };

    const burnEstimateRange = form.weight
        ? {
              min: Math.max(1, Math.round(Number(form.weight) / 4)),
              max: Math.max(2, Math.round(Number(form.weight) / 3.6)),
          }
        : null;
    const burnEstimate = burnEstimateRange
        ? `${burnEstimateRange.min} – ${burnEstimateRange.max} Hours`
        : "Calculated from net weight";

    const isDirty =
        images.length > 0 ||
        tags.length > 0 ||
        variants.length > 0 ||
        metaTitle.trim() !== "" ||
        metaKeywords.trim() !== "" ||
        Object.entries(form).some(([key, value]) =>
            key === "color"
                ? value !== "white"
                : key === "isActive"
                  ? value !== true
                  : value !== ""
        );

    const handleCancel = () => {
        if (
            isDirty &&
            !window.confirm("Discard this product? Your changes will be lost.")
        ) {
            return;
        }
        navigate(ROUTES.ADMIN_PRODUCTS);
    };

    return (
        <>
            <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold leading-normal text-black">
                        Add Products
                    </h1>
                    <p className="text-sm leading-4 text-[#94A3B8]">
                        Fill in the artisanal details and batch attributes to
                        create a new bespoke product.
                    </p>
                </div>
                
            </header>

            <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[minmax(300px,0.65fr)_minmax(0,1.1fr)]">
                <section className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)] sm:p-5">
                    <div className="mb-3 flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                        <div>
                            <h2 className="text-xl font-semibold text-[#111827]">
                                Product Media
                                <span className="text-[#FF8D28]">*</span>
                            </h2>
                            <p className="text-xs text-[#94A3B8]">
                                High fidelity product photos
                            </p>
                        </div>
                        <span className="rounded bg-[#F2F2F7] px-2 py-1 text-[11px] text-[#64748B]">
                            Primary &amp; Gallery
                        </span>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        onChange={(event) => {
                            addImages(event.target.files);
                            event.target.value = "";
                        }}
                        className="sr-only cursor-pointer"
                        aria-label="Upload product images"
                    />
                    <div
                        onDragEnter={(event) => {
                            event.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDragLeave={(event) => {
                            if (!event.currentTarget.contains(event.relatedTarget)) {
                                setIsDragging(false);
                            }
                        }}
                        onDrop={handleDrop}
                        className={`flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-5 text-center transition ${
                            isDragging
                                ? "border-[#2D8CFF] bg-blue-50"
                                : "border-[#94A3B8] bg-[#F8FAFC]/60"
                        }`}
                    >
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-xl text-[#2D8CFF]">
                            <FiUploadCloud aria-hidden="true" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-[#111827]">
                                Drag &amp; drop high-res images here
                            </p>
                            <p className="mt-1 text-[11px] text-[#94A3B8]">
                                or select original assets from your local studio
                                archive
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#292929] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#957358] cursor-pointer"
                        >
                            Upload Image
                        </button>
                        <p className="text-[10px] text-[#94A3B8]">
                            PNG / JPG / WEBP · Up to {MAX_IMAGES} images · 5 MB
                            each
                        </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                        <h2 className="text-xs font-semibold text-[#111827]">
                            Gallery Shots
                        </h2>
                        <span className="text-[11px] text-[#94A3B8]">
                            {images.length} of {MAX_IMAGES} images
                        </span>
                    </div>
                    {images.length > 0 ? (
                        <div className="mt-2 grid grid-cols-3 gap-3">
                            {images.map((image, index) => (
                                <ImageThumbnail
                                    key={image.id}
                                    file={image.file}
                                    index={index}
                                    onRemove={removeImage}
                                />
                            ))}
                            {images.length < MAX_IMAGES && (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#CBD5E1] text-[#64748B] transition hover:border-[#957358] hover:text-[#957358]"
                                >
                                    <FiPlus aria-hidden="true" />
                                    <span className="text-[10px]">Add photo</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="mt-2 grid grid-cols-3 gap-3">
                                {galleryExamples.map((image, index) => (
                                    <div
                                        key={image}
                                        className="relative aspect-square overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]"
                                    >
                                        <img
                                            src={image}
                                            alt={`Example product photography ${index + 1}`}
                                            className="h-full w-full object-cover"
                                        />
                                        <span className="absolute left-2 top-2 rounded bg-[#1F2937]/85 px-2 py-1 text-[10px] font-semibold text-white">
                                            {index === 0 ? "COVER" : "EXAMPLE"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-2 text-[10px] text-[#94A3B8]">
                                Example shots are for reference only. Upload your
                                own images to save a product gallery.
                            </p>
                        </>
                    )}

                    <aside className="mt-3 rounded-lg border border-[#B08968] p-3 text-xs text-[#9A6B45]">
                        <div className="flex gap-2">
                            <FiSun
                                className="mt-0.5 shrink-0 text-base"
                                aria-hidden="true"
                            />
                            <p>
                                <span className="font-semibold">
                                    Artisanal Photography Tip
                                </span>
                                <br />
                                Natural diffused sunlight and organic surface
                                textures highlight genuine wax clarity and
                                premium packaging detail.
                            </p>
                        </div>
                    </aside>
                </section>

                <section className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)] sm:p-5">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-[#F1F5F9] pb-3">
                        <div>
                            <h2 className="text-xl font-semibold text-[#111827]">
                                Basic Information
                            </h2>
                            <p className="text-xs text-[#94A3B8]">
                                Core catalog metadata and categorization
                            </p>
                        </div>
                        <p className="pt-1 text-[10px] text-[#94A3B8]">
                            Required fields marked with{" "}
                            <span className="text-[#FF8D28]">*</span>
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                <FieldLabel htmlFor="product-name" required>
                                    Product Name
                                </FieldLabel>
                                <span className="text-[10px] text-[#94A3B8]">
                                    Keep concise and distinctive
                                </span>
                            </div>
                            <input
                                id="product-name"
                                name="name"
                                value={form.name}
                                onChange={updateField}
                                placeholder="e.g. Vanilla Dream Candle"
                                autoComplete="off"
                                required
                                maxLength={120}
                                className={inputClassName}
                            />
                        </div>

                        <div>
                            <div className="mb-1.5 flex items-center justify-between">
                                <FieldLabel htmlFor="product-description" required>
                                    Description
                                </FieldLabel>
                                <span className="text-[10px] text-[#94A3B8]">
                                    {form.description.length}/500
                                </span>
                            </div>
                            <textarea
                                id="product-description"
                                name="description"
                                value={form.description}
                                onChange={updateField}
                                placeholder="Describe the materials, scent, and character of this product."
                                required
                                maxLength={500}
                                rows={5}
                                className="w-full resize-y rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-3 text-xs leading-5 text-[#111827] outline-none transition placeholder:text-[#94A3B8] focus:border-[#957358] focus:ring-2 focus:ring-[#957358]/15"
                            />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <FieldLabel htmlFor="product-category" required>
                                    Category
                                </FieldLabel>
                                <div className="relative mt-1.5">
                                    <select
                                        id="product-category"
                                        name="category"
                                        value={form.category}
                                        onChange={updateField}
                                        required
                                        className={`${inputClassName} appearance-none pr-9`}
                                    >
                                        <option value="" disabled>
                                            Select a category
                                        </option>
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
                                    <FiChevronDown className="pointer-events-none absolute right-3 top-3 text-[#64748B]" />
                                </div>
                            </div>
                            <div>
                                <FieldLabel htmlFor="product-series">
                                    Atelier Series
                                </FieldLabel>
                                <div className="relative mt-1.5">
                                    <select
                                        id="product-series"
                                        name="series"
                                        value={form.series}
                                        onChange={updateField}
                                        className={`${inputClassName} appearance-none pr-9`}
                                    >
                                        <option value="">Select a series</option>
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
                                    <FiChevronDown className="pointer-events-none absolute right-3 top-3 text-[#64748B]" />
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-[#F1F5F9] pt-3">
                            <FieldLabel htmlFor="product-tag">Tags &amp; Taxonomy</FieldLabel>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                {tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="inline-flex items-center gap-1 rounded-md bg-[#F2F2F7] px-2.5 py-1.5 text-[11px] text-[#334155]"
                                    >
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setTags((current) =>
                                                    current.filter(
                                                        (item) => item !== tag
                                                    )
                                                )
                                            }
                                            aria-label={`Remove ${tag} tag`}
                                            className="text-[#64748B] hover:text-[#DC2626]"
                                        >
                                            <FiX aria-hidden="true" />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    id="product-tag"
                                    value={tagInput}
                                    onChange={(event) =>
                                        setTagInput(event.target.value)
                                    }
                                    onKeyDown={handleTagKeyDown}
                                    placeholder="Add a tag"
                                    className="h-8 min-w-32 flex-1 rounded-md border border-[#E2E8F0] px-2 text-xs outline-none focus:border-[#957358]"
                                />
                                <button
                                    type="button"
                                    onClick={addTag}
                                    className="inline-flex h-8 items-center gap-1 rounded-md bg-black px-3 text-xs font-semibold text-white transition hover:bg-[#292929]"
                                >
                                    <FiPlus aria-hidden="true" />
                                    Add Tag
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

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
                    <span className="rounded bg-[#F2F2F7] px-2.5 py-1.5 text-[11px] text-[#475569]">
                        INR (₹)
                    </span>
                </div>

                <div className="grid gap-x-4 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
                    <div>
                        <div className="mb-1.5 flex items-center justify-between">
                            <FieldLabel htmlFor="product-sku" required>
                                SKU Code
                            </FieldLabel>
                            <button
                                type="button"
                                onClick={generateSku}
                                aria-label="Generate SKU"
                                title="Generate SKU"
                                className="text-[#94A3B8] transition hover:text-[#2D8CFF]"
                            >
                                <FiRefreshCw aria-hidden="true" />
                            </button>
                        </div>
                        <div className="relative">
                            <FiHash className="pointer-events-none absolute left-3 top-3 text-[#94A3B8]" />
                            <input
                                id="product-sku"
                                name="sku"
                                value={form.sku}
                                onChange={updateField}
                                placeholder="e.g. TW001"
                                required
                                maxLength={40}
                                className={`${inputClassName} pl-9 uppercase`}
                            />
                        </div>
                    </div>

                    <div>
                        <FieldLabel htmlFor="product-price" required>
                            Retail Price
                        </FieldLabel>
                        <div className="relative mt-1.5">
                            <span className="absolute left-3 top-2.5 text-xs text-[#64748B]">
                                ₹
                            </span>
                            <input
                                id="product-price"
                                name="price"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={form.price}
                                onChange={updateField}
                                placeholder="0.00"
                                required
                                className={`${inputClassName} pl-8 pr-16`}
                            />
                            <span className="absolute right-2 top-2 rounded bg-[#F2F2F7] px-1.5 py-0.5 text-[10px] text-[#64748B]">
                                Incl. Tax
                            </span>
                        </div>
                    </div>

                    <div>
                        <FieldLabel htmlFor="product-offer-price">
                            Offer Price
                        </FieldLabel>
                        <div className="relative mt-1.5">
                            <span className="absolute left-3 top-2.5 text-xs text-[#64748B]">
                                ₹
                            </span>
                            <input
                                id="product-offer-price"
                                name="offerPrice"
                                type="number"
                                min="0"
                                max={form.price || undefined}
                                step="0.01"
                                value={form.offerPrice}
                                onChange={updateField}
                                placeholder="Optional"
                                className={`${inputClassName} pl-8`}
                            />
                        </div>
                        <p className="mt-1 text-[10px] text-[#94A3B8]">
                            Must not exceed the retail price.
                        </p>
                    </div>

                    <div>
                        <FieldLabel htmlFor="product-scent" required>
                            Scent Profile
                        </FieldLabel>
                        <div className="relative mt-1.5">
                            <select
                                id="product-scent"
                                name="scent"
                                value={form.scent}
                                onChange={updateField}
                                required
                                className={`${inputClassName} appearance-none pr-9`}
                            >
                                <option value="" disabled>
                                    Select a scent profile
                                </option>
                                <option value="Warm Madagascar vanilla">
                                    Warm Madagascar vanilla
                                </option>
                                <option value="Rose and sandalwood">
                                    Rose and sandalwood
                                </option>
                                <option value="Citrus grove">Citrus grove</option>
                                <option value="Unscented">Unscented</option>
                            </select>
                            <FiChevronDown className="pointer-events-none absolute right-3 top-3 text-[#64748B]" />
                        </div>
                    </div>

                    <div>
                        <FieldLabel htmlFor="product-wax" required>
                            Wax Formulation
                        </FieldLabel>
                        <div className="relative mt-1.5">
                            <select
                                id="product-wax"
                                name="waxType"
                                value={form.waxType}
                                onChange={updateField}
                                required
                                className={`${inputClassName} appearance-none pr-9`}
                            >
                                <option value="" disabled>
                                    Select wax formulation
                                </option>
                                <option value="100% Botanical Soy Wax">
                                    100% Botanical Soy Wax
                                </option>
                                <option value="Beeswax">Beeswax</option>
                                <option value="Coconut Soy Blend">
                                    Coconut Soy Blend
                                </option>
                                <option value="Paraffin">Paraffin</option>
                            </select>
                            <FiChevronDown className="pointer-events-none absolute right-3 top-3 text-[#64748B]" />
                        </div>
                    </div>

                    <div>
                        <FieldLabel htmlFor="product-weight" required>
                            Net Weight
                        </FieldLabel>
                        <div className="relative mt-1.5">
                            <input
                                id="product-weight"
                                name="weight"
                                type="number"
                                min="1"
                                step="1"
                                value={form.weight}
                                onChange={updateField}
                                placeholder="e.g. 200"
                                required
                                className={`${inputClassName} pr-12`}
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-[#64748B]">
                                g
                            </span>
                        </div>
                    </div>

                    <div>
                        <FieldLabel htmlFor="product-stock" required>
                            Stock Quantity
                        </FieldLabel>
                        <input
                            id="product-stock"
                            name="stock"
                            type="number"
                            min="0"
                            step="1"
                            value={form.stock}
                            onChange={updateField}
                            placeholder="0"
                            required
                            className={`${inputClassName} mt-1.5`}
                        />
                    </div>

                    <div>
                        <FieldLabel htmlFor="product-burn-time">
                            Burn Time Estimate (hours)
                        </FieldLabel>
                        <div className="relative mt-1.5">
                            <input
                                id="product-burn-time"
                                name="burnTime"
                                type="number"
                                min="0"
                                step="1"
                                value={form.burnTime}
                                onChange={updateField}
                                placeholder="e.g. 45"
                                className={`${inputClassName} pr-12`}
                            />
                            <FiClock className="absolute right-3 top-3 text-[#94A3B8]" />
                        </div>
                    </div>

                    <div>
                        <FieldLabel htmlFor="product-color">Product Color</FieldLabel>
                        <input
                            id="product-color"
                            name="color"
                            value={form.color}
                            onChange={updateField}
                            placeholder="e.g. ivory"
                            maxLength={60}
                            className={`${inputClassName} mt-1.5`}
                        />
                    </div>

                    <label className="flex min-h-[62px] cursor-pointer items-center gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3.5">
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
                            <span className="block text-xs font-semibold text-[#475569]">
                                Active product
                            </span>
                            <span className="block text-[10px] text-[#94A3B8]">
                                Available in the product catalog
                            </span>
                        </span>
                    </label>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-[#E7EDF5] p-4">
                        <div className="mb-3">
                            <h3 className="text-sm font-semibold text-[#111827]">
                                Product Variants
                            </h3>
                            <p className="text-[11px] text-[#94A3B8]">
                                Optional options such as size or container.
                            </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                            <input
                                value={variantType}
                                onChange={(event) =>
                                    setVariantType(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        addVariant();
                                    }
                                }}
                                placeholder="Type (e.g. Size)"
                                aria-label="Variant type"
                                className={inputClassName}
                            />
                            <input
                                value={variantValue}
                                onChange={(event) =>
                                    setVariantValue(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        addVariant();
                                    }
                                }}
                                placeholder="Value (e.g. Large)"
                                aria-label="Variant value"
                                className={inputClassName}
                            />
                            <button
                                type="button"
                                onClick={addVariant}
                                className="inline-flex h-10 items-center justify-center gap-1 rounded-lg bg-black px-3 text-xs font-semibold text-white transition hover:bg-[#292929]"
                            >
                                <FiPlus aria-hidden="true" />
                                Add
                            </button>
                        </div>
                        {variants.length > 0 && (
                            <ul className="mt-3 flex flex-wrap gap-2">
                                {variants.map((variant, index) => (
                                    <li
                                        key={`${variant.type}-${variant.value}-${index}`}
                                        className="inline-flex items-center gap-2 rounded-md bg-[#F2F2F7] px-2.5 py-1.5 text-[11px] text-[#334155]"
                                    >
                                        {variant.type}: {variant.value}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setVariants((current) =>
                                                    current.filter(
                                                        (_, itemIndex) =>
                                                            itemIndex !== index
                                                    )
                                                )
                                            }
                                            aria-label={`Remove ${variant.type} ${variant.value} variant`}
                                            className="text-[#64748B] hover:text-[#DC2626]"
                                        >
                                            <FiX aria-hidden="true" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="rounded-xl border border-[#E7EDF5] p-4">
                        <div className="mb-3">
                            <h3 className="text-sm font-semibold text-[#111827]">
                                Search Metadata
                            </h3>
                            <p className="text-[11px] text-[#94A3B8]">
                                Optional SEO title and comma-separated keywords.
                            </p>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <FieldLabel htmlFor="product-meta-title">
                                    Metadata Title
                                </FieldLabel>
                                <input
                                    id="product-meta-title"
                                    value={metaTitle}
                                    onChange={(event) =>
                                        setMetaTitle(event.target.value)
                                    }
                                    maxLength={160}
                                    placeholder="Search result title"
                                    className={`${inputClassName} mt-1.5`}
                                />
                            </div>
                            <div>
                                <FieldLabel htmlFor="product-meta-keywords">
                                    Metadata Keywords
                                </FieldLabel>
                                <input
                                    id="product-meta-keywords"
                                    value={metaKeywords}
                                    onChange={(event) =>
                                        setMetaKeywords(event.target.value)
                                    }
                                    placeholder="vanilla, soy wax, handmade"
                                    className={`${inputClassName} mt-1.5`}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-[#E7EDF5] bg-[#F8FAFC] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">
                            Burn time estimate
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#111827]">
                            {form.burnTime
                                ? `${form.burnTime} Hours`
                                : burnEstimate}
                        </p>
                        <p className="mt-1 text-[11px] text-[#64748B]">
                            {form.burnTime
                                ? "Entered manually"
                                : burnEstimateRange
                                  ? `Estimated for ${form.weight} g · saves as ${burnEstimateRange.min} hours if left blank`
                                  : "Calculated from net weight"}
                        </p>
                    </div>
                    <div className="rounded-xl border border-[#E7EDF5] bg-[#F8FAFC] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">
                            Inventory threshold
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#111827]">
                            Low stock alert at {LOW_STOCK_THRESHOLD}
                        </p>
                        <p className="mt-1 text-[11px] text-[#64748B]">
                            Auto-dispatches restock notice
                        </p>
                    </div>
                    <div className="rounded-xl border border-[#E7EDF5] bg-[#F8FAFC] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">
                            Packaging standard
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#111827]">
                            Amber Jar + Cork Lid
                        </p>
                        <p className="mt-1 text-[11px] text-[#64748B]">
                            FSC Certified Kraft Box outer
                        </p>
                    </div>
                </div>

                <p className="mt-4 rounded-lg bg-[#F8FAFC] px-3 py-2 text-[11px] text-[#64748B]">
                    Ratings start at 0 and the creator is set from the signed-in
                    admin account.
                </p>
            </section>

            <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
                <button
                    type="button"
                    onClick={handleCancel}
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
                        <FiRefreshCw
                            className="animate-spin"
                            aria-hidden="true"
                        />
                    )}
                    {isSaving ? "Saving Product…" : "Add Product"}
                </button>
            </div>
            </form>
        </>
    );
};

export { AddProduct };

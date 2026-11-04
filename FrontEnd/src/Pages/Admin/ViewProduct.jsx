import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "react-toastify";
import {
    LuBox,
    LuChevronLeft,
    LuDroplets,
    LuPencil,
    LuScale,
    LuSun,
    LuTrash2,
} from "react-icons/lu";

import {
    deactivateProduct,
    getProduct,
} from "../../Services/AdminService.js";
import { getErrorMessage } from "../../Services/Api.js";
import { ROUTES } from "../../constants/routes.js";
import productFallbackImage from "../../assets/admin/646f7.png";

const LOW_STOCK_THRESHOLD = 10;

const formatPrice = (price) =>
    Number.isFinite(Number(price))
        ? new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
          }).format(Number(price))
        : "—";

const showFallbackImage = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = productFallbackImage;
};

const DetailRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center justify-between gap-4 border-b border-[#F1F5F9] py-4 last:border-b-0">
        <div className="flex items-center gap-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F2F2F7] text-lg text-[#0F172A]">
                <Icon aria-hidden="true" />
            </span>
            <span className="text-base text-[#334155]">{label}:</span>
        </div>
        <span className="text-right text-base font-medium text-black">
            {value}
        </span>
    </div>
);

const ViewProduct = () => {
    const navigate = useNavigate();
    const { productId } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        const loadProduct = async () => {
            setLoading(true);
            setError("");
            try {
                const response = await getProduct(productId, {
                    signal: controller.signal,
                });
                if (response?.product) {
                    setProduct(response.product);
                    setActiveImageIndex(0);
                } else {
                    setError("Product not found.");
                }
            } catch (requestError) {
                if (requestError?.name === "AbortError") return;
                setError(getErrorMessage(requestError));
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };

        loadProduct();
        return () => controller.abort();
    }, [productId]);

    useEffect(() => {
        if (!confirmingDelete) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === "Escape" && !isDeleting) {
                setConfirmingDelete(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [confirmingDelete, isDeleting]);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deactivateProduct(productId);
            toast.success("Product removed from active inventory.");
            navigate(ROUTES.ADMIN_PRODUCTS);
        } catch (requestError) {
            toast.error(getErrorMessage(requestError));
            setIsDeleting(false);
        }
    };

    if (loading) {
        return <p className="p-5 text-sm text-[#6B6B6B]">Loading product…</p>;
    }

    if (error || !product) {
        return (
            <div className="space-y-4 p-5">
                <p role="alert" className="text-sm text-red-700">
                    {error || "Product not found."}
                </p>
                <button
                    type="button"
                    onClick={() => navigate(ROUTES.ADMIN_PRODUCTS)}
                    className="rounded-lg border border-[#CBD5E1] bg-white px-4 py-2 text-sm font-semibold text-[#475569] transition hover:bg-[#F8FAFC] cursor-pointer"
                >
                    Back to Products
                </button>
            </div>
        );
    }

    const images = Array.isArray(product.images)
        ? product.images.filter(Boolean)
        : [];
    if (images.length === 0 && product.imageUrl) images.push(product.imageUrl);
    if (images.length === 0) images.push(productFallbackImage);

    const stock = Number(product.stock) || 0;
    const productIsActive = product.isActive !== false;
    const lowStock = stock <= LOW_STOCK_THRESHOLD;
    const status = !productIsActive
        ? {
              label: "Inactive",
              className: "bg-slate-100 text-slate-700",
              dot: "bg-slate-500",
          }
        : lowStock
          ? {
                label: "Low Stock",
                className: "bg-amber-50 text-amber-700",
                dot: "bg-amber-500",
            }
          : {
                label: "In Stock",
                className: "bg-[#E8F8EE] text-[#21C45D]",
                dot: "bg-[#21C45D]",
            };

    return (
        <>
            <button
                type="button"
                onClick={() => navigate(ROUTES.ADMIN_PRODUCTS)}
                className="mb-5 inline-flex items-center gap-3 text-sm font-medium uppercase tracking-[0.5px] text-[#0F172A] transition hover:text-[#64748B] cursor-pointer"
            >
                <LuChevronLeft
                    aria-hidden="true"
                    className="text-lg text-[#64748B]"
                />
                Back to Products
            </button>

            <section className="grid gap-8 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.2)] sm:p-8 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1fr)] lg:gap-14">
                <div className="space-y-4">
                    <img
                        src={images[activeImageIndex] ?? images[0]}
                        alt={product.name}
                        onError={showFallbackImage}
                        className="aspect-[4/5] w-full rounded-2xl object-cover"
                    />
                    {images.length > 1 && (
                        <div className="grid grid-cols-4 gap-4">
                            {images.map((image, index) => (
                                <button
                                    key={`${image}-${index}`}
                                    type="button"
                                    onClick={() => setActiveImageIndex(index)}
                                    aria-label={`Show image ${index + 1}`}
                                    aria-pressed={index === activeImageIndex}
                                    className={`aspect-square overflow-hidden rounded-lg transition cursor-pointer ${
                                        index === activeImageIndex
                                            ? "ring-2 ring-black ring-offset-2"
                                            : "opacity-80 hover:opacity-100"
                                    }`}
                                >
                                    <img
                                        src={image}
                                        alt=""
                                        onError={showFallbackImage}
                                        className="h-full w-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex min-w-0 flex-col">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <h1 className="text-3xl font-bold leading-tight text-black sm:text-4xl">
                            {product.name}
                        </h1>
                        <span
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-medium ${status.className}`}
                        >
                            <span
                                className={`h-2 w-2 rounded-full ${status.dot}`}
                                aria-hidden="true"
                            />
                            {status.label}
                        </span>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-black sm:text-4xl">
                        {formatPrice(product.price)}
                    </p>

                    <p className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-[#334155]">
                        <span>
                            Category:{" "}
                            <span className="font-semibold text-black">
                                {product.category || "—"}
                            </span>
                        </span>
                        <span className="text-[#CBD5E1]" aria-hidden="true">
                            |
                        </span>
                        <span>
                            SKU:{" "}
                            <span className="font-semibold text-black">
                                {product.sku || "—"}
                            </span>
                        </span>
                    </p>
                    {product.description && (
                        <p className="mt-3 max-w-[65ch] text-base leading-7 text-[#94A3B8]">
                            {product.description}
                        </p>
                    )}

                    <div className="mt-8 border-y border-[#E2E8F0] py-4">
                        <DetailRow
                            icon={LuSun}
                            label="Scent"
                            value={product.scent || "—"}
                        />
                        <DetailRow
                            icon={LuDroplets}
                            label="Wax Type"
                            value={product.waxType || "—"}
                        />
                        <DetailRow
                            icon={LuScale}
                            label="Weight"
                            value={product.weight ? `${product.weight} g` : "—"}
                        />
                        <DetailRow
                            icon={LuBox}
                            label="Stock Quantity"
                            value={stock}
                        />
                    </div>

                    <div className="mt-auto grid gap-4 pt-10 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => setConfirmingDelete(true)}
                            disabled={!productIsActive}
                            className="inline-flex h-14 items-center justify-center gap-3 rounded-lg border border-[#FF383C] bg-white text-base font-semibold text-[#FF383C] transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                        >
                            <LuTrash2 aria-hidden="true" className="text-lg" />
                            Delete Product
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    `${ROUTES.ADMIN_PRODUCTS}/${product._id}/edit`
                                )
                            }
                            className="inline-flex h-14 items-center justify-center gap-3 rounded-lg bg-black text-base font-semibold text-white transition hover:bg-[#292929] cursor-pointer"
                        >
                            <LuPencil aria-hidden="true" className="text-lg" />
                            Edit Product
                        </button>
                    </div>
                </div>
            </section>

            {confirmingDelete && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/[0.54] p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !isDeleting) {
                            setConfirmingDelete(false);
                        }
                    }}
                >
                    <div
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="view-delete-title"
                        aria-describedby="view-delete-description"
                        className="flex w-[440px] max-w-full flex-col gap-8 rounded-2xl bg-white p-8 text-center shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]"
                    >
                        <div className="flex flex-col items-center gap-3">
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FCEBEB] text-2xl text-[#FF383C]">
                                <LuTrash2 aria-hidden="true" />
                            </span>
                            <h2
                                id="view-delete-title"
                                className="text-xl font-bold text-[#2B1B14]"
                            >
                                Delete {product.name}?
                            </h2>
                            <p
                                id="view-delete-description"
                                className="text-xs leading-5 text-[#78716C]"
                            >
                                This product will be removed from active
                                inventory.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                autoFocus
                                onClick={() => setConfirmingDelete(false)}
                                disabled={isDeleting}
                                className="h-10 flex-1 rounded-lg border border-[#94A3B8]/70 bg-white text-sm font-semibold text-[#4B5563] hover:bg-[#F8FAFC] disabled:opacity-60 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="h-10 flex-1 rounded-lg bg-[#FF383C] text-sm font-semibold text-white hover:bg-[#EA2B30] disabled:opacity-60 cursor-pointer"
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export { ViewProduct };

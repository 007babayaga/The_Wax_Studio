import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "../../utils/toast.js";

import { getErrorMessage } from "../../Services/Api.js";
import {
    deactivateProduct,
    getProducts,
} from "../../Services/AdminService.js";
import { ROUTES } from "../../constants/routes.js";
import exportIcon from "../../assets/admin/e741f.svg";
import addIcon from "../../assets/admin/0e93d.svg";
import totalProductsIcon from "../../assets/admin/e3e46.svg";
import trendArrowIcon from "../../assets/admin/8af11.svg";
import totalProductsChart from "../../assets/admin/09fc6.svg";
import inStockIcon from "../../assets/admin/df5a0.svg";
import inStockChart from "../../assets/admin/e4c7c.svg";
import lowStockIcon from "../../assets/admin/cea30.svg";
import lowStockChart from "../../assets/admin/5aae9.svg";
import categoriesIcon from "../../assets/admin/b0e4a.svg";
import categoriesChart from "../../assets/admin/1773e.svg";
import productFallbackImage from "../../assets/admin/646f7.png";
import tableSearchIcon from "../../assets/admin/4430f.svg";
import dropdownArrowIcon from "../../assets/admin/97f7d.svg";
import filtersIcon from "../../assets/admin/38365.svg";
import editProductIcon from "../../assets/admin/d7e61.svg";
import deleteProductIcon from "../../assets/admin/19552.svg";
import deleteConfirmationIcon from "../../assets/admin/delete-confirmation.svg";
import previousPageIcon from "../../assets/admin/94536.svg";
import nextPageIcon from "../../assets/admin/28913.svg";

const LOW_STOCK_THRESHOLD = 10;
const PRODUCTS_PER_PAGE = 8;
const PAGE_PARAM = "page";

// Page numbers to show, with "…" gaps: 1 … 4 5 6 … 25.
const getPageItems = (currentPage, pageCount) => {
    if (pageCount <= 7) {
        return Array.from({ length: pageCount }, (_, index) => index + 1);
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(pageCount - 1, currentPage + 1);
    const items = [1];

    if (start > 2) items.push("start-gap");
    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
        items.push(pageNumber);
    }
    if (end < pageCount - 1) items.push("end-gap");
    items.push(pageCount);

    return items;
};

// One rule for stock everywhere, so the cards and the table never disagree
// (a missing stock value counts as 0 in both).
const getStock = (product) => Number(product.stock) || 0;
const isActive = (product) => product.isActive !== false;

const StatCard = ({ icon, status, label, value, chart, trend = false }) => (
    <article className="flex min-w-0 flex-col gap-[13px] overflow-hidden rounded-xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.2)]">
        <div className="flex w-full items-center justify-between gap-2">
            <img src={icon} alt="" aria-hidden="true" />
            {trend ? (
                <span className="flex items-center text-sm text-[#21C45D]">
                    <span className="rotate-180">
                        <img src={trendArrowIcon} alt="" aria-hidden="true" />
                    </span>
                    100%
                </span>
            ) : (
                <span className="text-right text-sm text-[#21C45D]">
                    {status}
                </span>
            )}
        </div>
        <div className="flex min-h-[71px] items-end justify-between gap-3">
            <div className="flex h-[71px] flex-col justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.55px] text-[#94A3B8]">
                    {label}
                </p>
                <p className="text-2xl font-bold tracking-[-0.6px] text-black">
                    {value}
                </p>
                <p className="text-[11px] text-[#94A3B8]">vs. last 7 days</p>
            </div>
            <img src={chart} alt="" aria-hidden="true" />
        </div>
    </article>
);

const escapeCsvValue = (value) => {
    const text = String(value ?? "");
    const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safeText.replaceAll('"', '""')}"`;
};

const Product = () => {
    const navigate = useNavigate();

    // The Navbar writes the search term into the URL (?search=...); this page
    // reads it and makes the API call.
    const [searchParams, setSearchParams] = useSearchParams();
    const search = (searchParams.get("search") ?? "").trim();

    // The page lives in the URL (?page=), so Back from a product returns to
    // it, and the Navbar dropping ?page= on a new search resets it to 1.
    const page = Math.max(
        1,
        Number.parseInt(searchParams.get(PAGE_PARAM) ?? "", 10) || 1
    );
    const setPage = (pageNumber) => {
        setSearchParams(
            (current) => {
                const next = new URLSearchParams(current);
                if (pageNumber <= 1) next.delete(PAGE_PARAM);
                else next.set(PAGE_PARAM, String(pageNumber));
                return next;
            },
            { replace: true }
        );
    };
    const tableSectionRef = useRef(null);

    // Full inventory: feeds the stat cards, so they never change with a search.
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Search results, tagged with the term they belong to.
    const [searchState, setSearchState] = useState({
        term: "",
        items: [],
        error: "",
    });
    const [tableSearch, setTableSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [deactivatingProductId, setDeactivatingProductId] = useState("");
    const [productPendingDelete, setProductPendingDelete] = useState(null);
    const deleteDialogRef = useRef(null);
    const cancelDeleteButtonRef = useRef(null);

    useEffect(() => {
        let active = true;

        const loadProducts = async () => {
            try {
                const response = await getProducts();
                if (active) {
                    setProducts(
                        Array.isArray(response?.products) ? response.products : []
                    );
                }
            } catch (requestError) {
                if (active) setError(getErrorMessage(requestError));
            } finally {
                if (active) setLoading(false);
            }
        };

        loadProducts();
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!search) return undefined;

        const controller = new AbortController();

        const searchProducts = async () => {
            try {
                const response = await getProducts(
                    { search },
                    { signal: controller.signal }
                );

                setSearchState({
                    term: search,
                    items: Array.isArray(response?.products)
                        ? response.products
                        : [],
                    error: "",
                });
            } catch (requestError) {
                if (requestError?.name === "AbortError") return;

                setSearchState({
                    term: search,
                    items: [],
                    error: getErrorMessage(requestError),
                });
            }
        };

        searchProducts();

        // Cancels the previous request, so a slow old response can never
        // overwrite a newer one.
        return () => controller.abort();
    }, [search]);

    useEffect(() => {
        if (!productPendingDelete) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        cancelDeleteButtonRef.current?.focus();

        const handleDialogKeyDown = (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                setProductPendingDelete(null);
                return;
            }

            if (event.key !== "Tab") return;
            const buttons =
                deleteDialogRef.current?.querySelectorAll(
                    "button:not(:disabled)"
                ) ?? [];
            if (buttons.length === 0) return;

            const firstButton = buttons[0];
            const lastButton = buttons[buttons.length - 1];
            if (event.shiftKey && document.activeElement === firstButton) {
                event.preventDefault();
                lastButton.focus();
            } else if (
                !event.shiftKey &&
                document.activeElement === lastButton
            ) {
                event.preventDefault();
                firstButton.focus();
            }
        };

        document.addEventListener("keydown", handleDialogKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleDialogKeyDown);
        };
    }, [productPendingDelete]);

    // Cards always describe the whole inventory, never the search results.
    const activeProducts = products.filter(isActive);
    const lowStockCount = activeProducts.filter(
        (product) => getStock(product) <= LOW_STOCK_THRESHOLD
    ).length;
    const inStockCount = activeProducts.length - lowStockCount;
    const categoryCount = new Set(
        activeProducts
            .map((product) =>
                String(product.category ?? "")
                    .trim()
                    .toLowerCase()
            )
            .filter(Boolean)
    ).size;

    const exportProducts = () => {
        const headers = ["Name", "Category", "SKU", "Price", "Stock", "Status"];
        const rows = products.map((product) => [
            product.name,
            product.category,
            product.sku,
            product.price,
            getStock(product),
            !isActive(product)
                ? "Inactive"
                : getStock(product) <= LOW_STOCK_THRESHOLD
                  ? "Low stock"
                  : "In stock",
        ]);
        const csv = [headers, ...rows]
            .map((row) => row.map(escapeCsvValue).join(","))
            .join("\r\n");
        const objectUrl = URL.createObjectURL(
            new Blob([csv], { type: "text/csv;charset=utf-8;" })
        );
        const downloadLink = document.createElement("a");

        downloadLink.href = objectUrl;
        downloadLink.download = "wax-studio-products.csv";
        downloadLink.click();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    };

    // The table shows search results while a search is active.
    const searchSettled = searchState.term === search;
    const tableProducts = search ? searchState.items : products;
    const categories = [
        ...new Set(
            products
                .map((product) => String(product.category ?? "").trim())
                .filter(Boolean)
        ),
    ].sort((first, second) => first.localeCompare(second));
    const normalizedTableSearch = tableSearch.trim().toLowerCase();
    const filteredProducts = tableProducts.filter((product) => {
        const category = String(product.category ?? "").trim();
        const matchesSearch =
            !normalizedTableSearch ||
            [product.name, product.sku, category].some((value) =>
                String(value ?? "")
                    .toLowerCase()
                    .includes(normalizedTableSearch)
            );
        const stock = getStock(product);
        const matchesCategory =
            !categoryFilter || category === categoryFilter;
        const matchesStatus =
            !statusFilter ||
            (statusFilter === "active" && isActive(product)) ||
            (statusFilter === "inactive" && !isActive(product)) ||
            (statusFilter === "low-stock" &&
                isActive(product) &&
                stock <= LOW_STOCK_THRESHOLD) ||
            (statusFilter === "in-stock" &&
                isActive(product) &&
                stock > LOW_STOCK_THRESHOLD);

        return matchesSearch && matchesCategory && matchesStatus;
    });
    const pageCount = Math.max(
        1,
        Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE)
    );
    const currentPage = Math.min(page, pageCount);
    const firstItemIndex =
        filteredProducts.length === 0
            ? 0
            : (currentPage - 1) * PRODUCTS_PER_PAGE + 1;
    const lastItemIndex = Math.min(
        currentPage * PRODUCTS_PER_PAGE,
        filteredProducts.length
    );
    const visibleProducts = filteredProducts.slice(
        (currentPage - 1) * PRODUCTS_PER_PAGE,
        currentPage * PRODUCTS_PER_PAGE
    );

    // Always step from the page on screen, not the raw URL value, which can
    // be past the last page after a delete or a filter change.
    const goToPage = (pageNumber) => {
        const target = Math.min(Math.max(1, pageNumber), pageCount);
        if (target === currentPage) return;

        setPage(target);
        tableSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    };

    const clearTableFilters = () => {
        setTableSearch("");
        setCategoryFilter("");
        setStatusFilter("");
        setPage(1);
    };

    const handleDeactivate = async (product) => {
        if (!product?._id) return;

        setDeactivatingProductId(product._id);
        try {
            await deactivateProduct(product._id);
            setProducts((current) =>
                current.map((item) =>
                    item._id === product._id
                        ? { ...item, isActive: false }
                        : item
                )
            );
            setSearchState((current) => ({
                ...current,
                items: current.items.map((item) =>
                    item._id === product._id
                        ? { ...item, isActive: false }
                        : item
                ),
            }));
            setProductPendingDelete(null);
            toast.success("Product removed from active inventory.");
        } catch (requestError) {
            toast.error(getErrorMessage(requestError));
        } finally {
            setDeactivatingProductId("");
        }
    };
    // Rows already on screen stay visible while a new search loads, so the
    // table doesn't flash empty on every pause in typing.
    const tableLoading = search
        ? !searchSettled && visibleProducts.length === 0
        : loading;
    const tableError = search
        ? searchSettled
            ? searchState.error
            : ""
        : error;

    return (
        <div className="space-y-8">
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold leading-normal text-black">
                            Products
                        </h1>
                        <p className="text-sm leading-[19px] text-[#94A3B8]">
                            Manage your product catalog. Add, edit or remove
                            products.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            onClick={exportProducts}
                            disabled={loading || products.length === 0}
                            className="inline-flex h-11 items-center justify-center gap-3 rounded-lg border-[0.5px] border-[#4B5563] bg-white px-[14.5px] text-sm font-semibold text-black shadow-[0_1px_1px_rgba(0,0,0,0.05)] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        >
                            <img src={exportIcon} alt="" aria-hidden="true" />
                            Export
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                navigate(`${ROUTES.ADMIN_PRODUCTS}/add`)
                            }
                            className="inline-flex h-11 items-center gap-3 rounded-lg border-[0.5px] border-[#4B5563] bg-black px-4 text-sm font-semibold text-white transition hover:bg-[#292929] cursor-pointer"
                        >
                            <img src={addIcon} alt="" aria-hidden="true" />
                            Add Product
                        </button>
                    </div>
                </header>

                <section
                    aria-label="Product catalog summary"
                    className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4"
                >
                    <StatCard
                        icon={totalProductsIcon}
                        label="Total Products"
                        value={loading ? "…" : products.length}
                        chart={totalProductsChart}
                        trend
                    />
                    <StatCard
                        icon={inStockIcon}
                        label="In Stock"
                        value={loading ? "…" : inStockCount}
                        status="Healthy Inventory"
                        chart={inStockChart}
                    />
                    <StatCard
                        icon={lowStockIcon}
                        label="Low Stock"
                        value={loading ? "…" : lowStockCount}
                        status="Requires Reorder"
                        chart={lowStockChart}
                    />
                    <StatCard
                        icon={categoriesIcon}
                        label="Categories"
                        value={loading ? "…" : categoryCount}
                        status="Fragrance Families"
                        chart={categoriesChart}
                    />
                </section>

                <section
                    ref={tableSectionRef}
                    className="scroll-mt-4 overflow-hidden rounded-xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                >
                    <div className="mb-10 flex flex-wrap items-center justify-between gap-3">
                        <label className="flex min-h-11 w-full max-w-[448px] flex-1 items-center gap-2.5 rounded-xl bg-[#F2F2F7] px-3.5 py-2.5">
                            <img
                                src={tableSearchIcon}
                                alt=""
                                aria-hidden="true"
                            />
                            <input
                                type="search"
                                value={tableSearch}
                                onChange={(event) => {
                                    setTableSearch(event.target.value);
                                    setPage(1);
                                }}
                                placeholder="Search by name, SKU, or category..."
                                aria-label="Search inventory by name, SKU, or category"
                                className="min-w-0 flex-1 bg-transparent text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
                            />
                        </label>

                        <div className="flex flex-wrap items-center gap-2.5">
                            <label className="relative">
                                <span className="sr-only">Filter by category</span>
                                <select
                                    value={categoryFilter}
                                    onChange={(event) => {
                                        setCategoryFilter(event.target.value);
                                        setPage(1);
                                    }}
                                    className="h-9 appearance-none rounded-md border-[0.5px] border-[#94A3B8] bg-white py-2 pl-2.5 pr-8 text-xs text-black outline-none focus:border-[#64748B]"
                                >
                                    <option value="">All Categories</option>
                                    {categories.map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>
                                <img
                                    src={dropdownArrowIcon}
                                    alt=""
                                    aria-hidden="true"
                                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 -rotate-90"
                                />
                            </label>
                            <label className="relative">
                                <span className="sr-only">Filter by status</span>
                                <select
                                    value={statusFilter}
                                    onChange={(event) => {
                                        setStatusFilter(event.target.value);
                                        setPage(1);
                                    }}
                                    className="h-9 appearance-none rounded-md border-[0.5px] border-[#94A3B8] bg-white py-2 pl-2.5 pr-8 text-xs text-black outline-none focus:border-[#64748B]"
                                >
                                    <option value="">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="in-stock">In Stock</option>
                                    <option value="low-stock">Low Stock</option>
                                </select>
                                <img
                                    src={dropdownArrowIcon}
                                    alt=""
                                    aria-hidden="true"
                                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 -rotate-90"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={clearTableFilters}
                                aria-label="Clear inventory filters"
                                title="Clear filters"
                                className="flex h-9 w-9 items-center justify-center rounded-md border-[0.5px] border-[#94A3B8] bg-white transition hover:bg-[#F8FAFC]"
                            >
                                <img
                                    src={filtersIcon}
                                    alt=""
                                    aria-hidden="true"
                                />
                            </button>
                        </div>
                    </div>

                    {search && (
                        <p role="status" className="mb-3 text-xs text-[#64748B]">
                            {searchSettled
                                ? `Results for "${search}"`
                                : "Searching…"}
                        </p>
                    )}

                    {tableLoading ? (
                        <p className="p-5 text-sm text-[#6B6B6B]">
                            Loading products…
                        </p>
                    ) : tableError ? (
                        <p role="alert" className="p-5 text-sm text-red-700">
                            {tableError}
                        </p>
                    ) : visibleProducts.length === 0 ? (
                        <p className="p-5 text-sm text-[#6B6B6B]">
                            {search || tableSearch
                                ? "No products match your search."
                                : "No products found."}
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] table-fixed text-left">
                                <colgroup>
                                    <col className="w-[12%]" />
                                    <col className="w-[19%]" />
                                    <col className="w-[17%]" />
                                    <col className="w-[14%]" />
                                    <col className="w-[14%]" />
                                    <col className="w-[14%]" />
                                    <col className="w-[10%]" />
                                </colgroup>
                                <thead className="border-y border-[#F1F5F9] bg-[#F8FAFC]/80 text-xs font-bold uppercase text-[#64748B]">
                                    <tr>
                                        <th className="px-3 py-3">Image</th>
                                        <th className="px-3 py-3">Product Name</th>
                                        <th className="px-3 py-3">Category</th>
                                        <th className="px-3 py-3">Price</th>
                                        <th className="px-3 py-3">Stock</th>
                                        <th className="px-3 py-3">Status</th>
                                        <th className="px-3 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#F1F5F9]">
                                    {visibleProducts.map((product) => {
                                        const stock = getStock(product);
                                        const lowStock =
                                            stock <= LOW_STOCK_THRESHOLD;
                                        const productIsActive = isActive(product);
                                        const productImage =
                                            product.images?.[0] ||
                                            product.imageUrl ||
                                            product.image ||
                                            productFallbackImage;
                                        const formattedPrice =
                                            Number.isFinite(Number(product.price))
                                                ? new Intl.NumberFormat("en-IN", {
                                                      style: "currency",
                                                      currency: "INR",
                                                      maximumFractionDigits: 0,
                                                  }).format(Number(product.price))
                                                : "—";

                                        return (
                                            <tr
                                                key={product._id ?? `${product.name}-${product.sku}`}
                                                onClick={() =>
                                                    navigate(
                                                        `${ROUTES.ADMIN_PRODUCTS}/${product._id}`
                                                    )
                                                }
                                                className="cursor-pointer text-xs transition hover:bg-[#F8FAFC]"
                                            >
                                                <td className="px-3 py-1">
                                                    <img
                                                        src={productImage}
                                                        alt={`${product.name} product`}
                                                        onError={(event) => {
                                                            event.currentTarget.onerror = null;
                                                            event.currentTarget.src =
                                                                productFallbackImage;
                                                        }}
                                                        className="h-11 w-11 rounded-lg object-cover shadow-[0_0_0_1px_rgba(226,232,240,0.7)]"
                                                    />
                                                </td>
                                                <td className="px-3 py-3 font-semibold text-[#0F172A]">
                                                    {/* Real link so keyboard users and Ctrl+click work too. */}
                                                    <Link
                                                        to={`${ROUTES.ADMIN_PRODUCTS}/${product._id}`}
                                                        onClick={(event) =>
                                                            event.stopPropagation()
                                                        }
                                                        className="hover:underline"
                                                    >
                                                        {product.name}
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-3 text-[#64748B]">
                                                    {product.category || "—"}
                                                </td>
                                                <td className="px-3 py-3 font-semibold text-[#0F172A]">
                                                    {formattedPrice}
                                                </td>
                                                <td className="px-3 py-3 text-[#475569]">
                                                    {stock}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span
                                                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                                            !productIsActive
                                                                ? "border-slate-200 bg-slate-100 text-slate-700"
                                                                : lowStock
                                                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                                                  : "border-emerald-200 bg-emerald-50 text-emerald-600"
                                                        }`}
                                                    >
                                                        {!productIsActive
                                                            ? "Inactive"
                                                            : lowStock
                                                              ? "Low Stock"
                                                              : "In Stock"}
                                                    </span>
                                                </td>
                                                <td
                                                    className="px-3 py-3 cursor-default"
                                                    onClick={(event) =>
                                                        event.stopPropagation()
                                                    }
                                                >
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                navigate(
                                                                    `${ROUTES.ADMIN_PRODUCTS}/${product._id}/edit`
                                                                )
                                                            }
                                                            aria-label={`Edit ${product.name}`}
                                                            title="Edit product"
                                                            className="rounded p-1 transition hover:bg-blue-50 cursor-pointer"
                                                        >
                                                            <img
                                                                src={editProductIcon}
                                                                alt=""
                                                                aria-hidden="true"
                                                            />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setProductPendingDelete(
                                                                    product
                                                                )
                                                            }
                                                            disabled={
                                                                !productIsActive ||
                                                                deactivatingProductId ===
                                                                    product._id
                                                            }
                                                            aria-label={`Remove ${product.name} from active inventory`}
                                                            title="Remove from active inventory"
                                                            className="rounded p-1 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                                                        >
                                                            <img
                                                                src={deleteProductIcon}
                                                                alt=""
                                                                aria-hidden="true"
                                                            />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!tableLoading && !tableError && (
                        <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#F1F5F9] pt-3">
                            <p className="text-xs text-[#4B5563]">
                                {filteredProducts.length === 0
                                    ? "No products to show"
                                    : `Showing ${firstItemIndex}–${lastItemIndex} of ${filteredProducts.length} products`}
                            </p>
                            {pageCount > 1 && (
                            <nav
                                aria-label="Inventory pages"
                                className="flex flex-wrap items-center gap-1"
                            >
                                <button
                                    type="button"
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    aria-label="Previous page"
                                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <img
                                        src={previousPageIcon}
                                        alt=""
                                        aria-hidden="true"
                                    />
                                </button>
                                {getPageItems(currentPage, pageCount).map(
                                    (item) =>
                                        typeof item === "string" ? (
                                            <span
                                                key={item}
                                                aria-hidden="true"
                                                className="flex h-8 w-6 items-center justify-center text-xs text-[#94A3B8]"
                                            >
                                                …
                                            </span>
                                        ) : (
                                            <button
                                                key={item}
                                                type="button"
                                                onClick={() => goToPage(item)}
                                                aria-label={`Page ${item}`}
                                                aria-current={
                                                    item === currentPage
                                                        ? "page"
                                                        : undefined
                                                }
                                                className={`flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-lg px-1 text-xs ${
                                                    item === currentPage
                                                        ? "bg-black font-semibold text-white"
                                                        : "text-[#94A3B8] hover:bg-[#F8FAFC]"
                                                }`}
                                            >
                                                {item}
                                            </button>
                                        )
                                )}
                                <button
                                    type="button"
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === pageCount}
                                    aria-label="Next page"
                                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <img
                                        src={nextPageIcon}
                                        alt=""
                                        aria-hidden="true"
                                    />
                                </button>
                            </nav>
                            )}
                        </footer>
                    )}
                </section>
                {productPendingDelete && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/[0.54] p-4"
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget) {
                                setProductPendingDelete(null);
                            }
                        }}
                    >
                        <div
                            ref={deleteDialogRef}
                            role="alertdialog"
                            aria-modal="true"
                            aria-labelledby="delete-product-title"
                            aria-describedby="delete-product-description"
                            tabIndex={-1}
                            className="relative flex w-[480px] max-w-full flex-col items-center gap-11 rounded-2xl border border-[#4B5563]/50 bg-white p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]"
                            onMouseDown={(event) => event.stopPropagation()}
                        >
                            <div className="flex w-full flex-col gap-5">
                                <div className="flex flex-col items-center gap-3 text-center">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FCEBEB]">
                                        <img
                                            src={deleteConfirmationIcon}
                                            alt=""
                                            aria-hidden="true"
                                        />
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <h2
                                            id="delete-product-title"
                                            className="text-xl leading-7 font-bold tracking-[-0.5px] text-[#2B1B14]"
                                        >
                                            Are you sure you want to delete this
                                            product?
                                        </h2>
                                        <p
                                            id="delete-product-description"
                                            className="max-w-[360px] text-xs leading-[19.5px] text-[#78716C]"
                                        >
                                            This action cannot be undone. This
                                            product will be removed from active
                                            inventory.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#94A3B8]/70 bg-[#F2F2F7] p-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <img
                                            src={
                                                productPendingDelete.images?.[0] ||
                                                productPendingDelete.imageUrl ||
                                                productPendingDelete.image ||
                                                productFallbackImage
                                            }
                                            alt=""
                                            aria-hidden="true"
                                            onError={(event) => {
                                                event.currentTarget.onerror = null;
                                                event.currentTarget.src =
                                                    productFallbackImage;
                                            }}
                                            className="h-12 w-12 shrink-0 rounded-lg border border-[#E5DACB] bg-[#FFFBEB] object-cover"
                                        />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm leading-5 font-bold text-black">
                                                {productPendingDelete.name}
                                            </p>
                                            <p className="text-[11px] leading-5 text-[#4B5563]">
                                                SKU:{" "}
                                                {productPendingDelete.sku || "—"}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="shrink-0 text-sm leading-5 font-bold text-[#2B1B14]">
                                        {Number.isFinite(
                                            Number(productPendingDelete.price)
                                        )
                                            ? new Intl.NumberFormat("en-IN", {
                                                  style: "currency",
                                                  currency: "INR",
                                                  maximumFractionDigits: 0,
                                              }).format(
                                                  Number(
                                                      productPendingDelete.price
                                                  )
                                              )
                                            : "—"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex w-full gap-3">
                                <button
                                    ref={cancelDeleteButtonRef}
                                    type="button"
                                    onClick={() =>
                                        setProductPendingDelete(null)
                                    }
                                    disabled={Boolean(deactivatingProductId)}
                                    className="h-[37px] min-w-0 flex-1 rounded-lg border border-[#94A3B8]/70 bg-white text-xs font-semibold text-[#4B5563] shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer "
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleDeactivate(productPendingDelete)
                                    }
                                    disabled={Boolean(deactivatingProductId)}
                                    className="h-[37px] min-w-0 flex-1 rounded-lg bg-[#FF383C] text-xs font-semibold text-white shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-[#EA2B30] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                                >
                                    {deactivatingProductId
                                        ? "Deleting..."
                                        : "Delete"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
};

export { Product };
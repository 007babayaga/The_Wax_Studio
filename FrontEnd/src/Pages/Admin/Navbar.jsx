import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { CiSearch } from "react-icons/ci";
import { IoMdNotificationsOutline } from "react-icons/io";
import { FiSettings } from "react-icons/fi";

import { useAuth } from "../../Context/Authcontext";
import { ROUTES } from "../../constants/routes.js";

const ICON_BUTTON_CLASS =
    "relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-xl text-[#2F2F2F] transition hover:bg-[#F3F1EF] focus-visible:outline-2 focus-visible:outline-[#957358] sm:h-10 sm:w-10";

const DEBOUNCE_DELAY_MS = 400;
const SEARCH_PARAM = "search";
const PAGE_PARAM = "page";

const getInitials = (name = "") => {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) return "?";

    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";

    return `${first}${last}`.toUpperCase();
};

const Navbar = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const urlSearch = searchParams.get(SEARCH_PARAM) ?? "";
    const isProductsPage = location.pathname === ROUTES.ADMIN_PRODUCTS;

    const [query, setQuery] = useState(urlSearch);

    // The last search term this navbar put in the URL. Used to tell our own
    // URL updates apart from outside ones (Back/Forward, links, leaving the page).
    const appliedSearchRef = useRef(urlSearch);

    // Searching only changes the URL. The dashboard reads ?search= and
    // fetches its own data, so the navbar never touches the API.
    const applySearch = useCallback(
        (value) => {
            const trimmed = value.trim();

            // Keep other filters (category, status) when already on the page.
            const next = new URLSearchParams(
                isProductsPage ? searchParams : undefined
            );

            if (trimmed) next.set(SEARCH_PARAM, trimmed);
            else next.delete(SEARCH_PARAM);

            next.delete(PAGE_PARAM); // a new search starts from page 1

            const search = next.toString();

            appliedSearchRef.current = trimmed;

            navigate(
                {
                    pathname: ROUTES.ADMIN_PRODUCTS,
                    search: search ? `?${search}` : "",
                },
                { replace: isProductsPage }
            );
        },
        [navigate, isProductsPage, searchParams]
    );

    // Outside URL change (Back/Forward, a link, leaving the dashboard):
    // mirror it into the input so the two never disagree.
    useEffect(() => {
        if (urlSearch !== appliedSearchRef.current) {
            appliedSearchRef.current = urlSearch;
            setQuery(urlSearch);
        }
    }, [urlSearch]);

    // Live search while typing, only on the dashboard. On other pages
    // the search runs on Enter, so typing never throws the admin to another page.
    useEffect(() => {
        const trimmed = query.trim();

        if (!isProductsPage || trimmed === urlSearch) return undefined;

        const timeoutId = setTimeout(() => {
            applySearch(trimmed);
        }, DEBOUNCE_DELAY_MS);

        return () => clearTimeout(timeoutId);
    }, [query, urlSearch, isProductsPage, applySearch]);

    const handleSubmit = (event) => {
        event.preventDefault();

        if (isProductsPage && query.trim() === urlSearch) return;

        applySearch(query);
    };

    return (
        <div className="flex h-full items-center gap-2 px-2.5 sm:gap-4 sm:px-6">
            <form
                role="search"
                className="relative min-w-0 flex-1 sm:max-w-xs"
                onSubmit={handleSubmit}
            >
                <input
                    id="admin-search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search..."
                    aria-label="Search products"
                    autoComplete="off"
                    className="h-9 w-full rounded-full bg-[#f3f3f8] pl-3 pr-10 text-sm text-[#2F2F2F] placeholder-[#6B6B6B] outline-none transition focus:ring-2 focus:ring-[#957358]/30 sm:pl-5 sm:pr-12"
                />

                <button
                    type="submit"
                    aria-label="Search"
                    className="absolute inset-y-0 right-2 flex cursor-pointer items-center justify-center rounded-full px-2 text-xl text-[#2F2F2F] transition hover:text-[#957358] focus-visible:outline-2 focus-visible:outline-[#957358]"
                >
                    <CiSearch aria-hidden="true" />
                </button>
            </form>

            <div className="ml-auto flex shrink-0 items-center gap-0 sm:gap-2">
                <button
                    type="button"
                    aria-label="Notifications"
                    className={ICON_BUTTON_CLASS}
                >
                    <IoMdNotificationsOutline aria-hidden="true" />
                </button>
                <Link
                    to={ROUTES.ADMIN_SETTINGS}
                    aria-label="Settings"
                    title="Settings"
                    className={ICON_BUTTON_CLASS}
                >
                    <FiSettings aria-hidden="true" />
                </Link>
                <Link
                    to={ROUTES.ADMIN_SETTINGS}
                    title={user?.name ? `${user.name} · Profile settings` : "Profile settings"}
                    aria-label={
                        user?.name
                            ? `Signed in as ${user.name}. Open profile settings`
                            : "Open profile settings"
                    }
                    className="shrink-0 rounded-full transition hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#957358]"
                >
                    {user?.profilePicture ? (
                        <img
                            src={user.profilePicture}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-8 w-8 rounded-full object-cover sm:h-9 sm:w-9"
                        />
                    ) : (
                        <span
                            aria-hidden="true"
                            className="flex h-8 w-8 select-none items-center justify-center rounded-full bg-[#957351] text-xs font-semibold tracking-wide text-white sm:h-9 sm:w-9"
                        >
                            {getInitials(user?.name)}
                        </span>
                    )}
                </Link>
            </div>
        </div>
    );
};

export { Navbar };
import { useEffect } from "react";
import { useLocation } from "react-router";

// Chrome remembers a favicon per URL and doesn't re-read <link rel="icon"> on
// client-side (pushState) navigation, so some routes show a stale or blank icon.
// Swapping in fresh copies of the icon links after each route change forces
// Chrome to apply them again.
const useFaviconRefresh = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        document.querySelectorAll('link[rel~="icon"]').forEach((link) => {
            link.replaceWith(link.cloneNode());
        });
    }, [pathname]);
};

export { useFaviconRefresh };

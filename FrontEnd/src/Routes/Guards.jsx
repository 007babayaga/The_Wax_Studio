import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../Context/Authcontext.jsx";
import { ROLES, ROUTES, getPostLoginRoute } from "../constants/routes.js";

const SessionLoader = () => {
    return (
        <div
            role="status"
            aria-live="polite"
            aria-label="Loading session"
            className="flex min-h-dvh items-center justify-center bg-[#FAFAFC]"
        >
            <div className="flex flex-col items-center">
                <div
                    aria-hidden="true"
                    className="relative flex h-12 w-12 items-center justify-center"
                >
                    <div className="absolute inset-0 animate-ping rounded-2xl bg-black/5" />
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.06]">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#E5E5EA] border-t-[#111827]" />
                    </div>
                </div>

                <p className="mt-5 text-sm font-medium text-[#55555C]">
                    Loading your session
                </p>
            </div>
        </div>
    );
};

// Login / SignUp: as soon as a user exists (right after login, or when a
// logged-in user opens /login) they are sent to their landing page.
// Admins land on the dashboard; others return to the page they came from.
const GuestRoute = () => {
    const { user, initializing } = useAuth();
    const location = useLocation();

    if (initializing) return <SessionLoader/>;

    if (user) {
        return (
            <Navigate
                to={getPostLoginRoute(user.role, location.state?.from)}
                replace
            />
        );
    }

    return <Outlet />;
};

// Any logged-in user.
const RequireAuth = () => {
    const { user, initializing } = useAuth();
    const location = useLocation();

    if (initializing) return <SessionLoader />;

    if (!user) {
        return (
            <Navigate to={ROUTES.LOGIN} replace state={{ from: location }} />
        );
    }

    return <Outlet />;
};

// Admin pages only.
const RequireAdmin = () => {
    const { user, initializing } = useAuth();
    const location = useLocation();

    if (initializing) return <SessionLoader />;

    if (!user) {
        return (
            <Navigate to={ROUTES.LOGIN} replace state={{ from: location }} />
        );
    }

    if (user.role !== ROLES.ADMIN) {
        return <Navigate to={ROUTES.HOME} replace />;
    }

    return <Outlet />;
};

export { GuestRoute, RequireAuth, RequireAdmin };
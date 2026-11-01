const ROLES = { ADMIN: "admin", USER: "user" };

const getDefaultRouteForRole = (role) =>
    role === ROLES.ADMIN ? ROUTES.ADMIN_DASHBOARD : ROUTES.HOME;

const getPostLoginRoute = (role, from) => {
    const target = from ? `${from.pathname ?? ""}${from.search ?? ""}` : "";
    const isAdminTarget = target === "/admin" || target.startsWith("/admin/");

    if (role === ROLES.ADMIN) {
        return isAdminTarget ? target : ROUTES.ADMIN_DASHBOARD;
    }

    const isAuthPage = target === ROUTES.LOGIN || target === ROUTES.SIGNUP;

    if (!target || isAdminTarget || isAuthPage) {
        return getDefaultRouteForRole(role);
    }

    return target;
};

const ROUTES = {
    HOME: "/",
    SHOP: "/shop",
    ABOUT: "/about",
    CONTACT: "/contact",
    LOGIN: "/login",
    SIGNUP: "/signup",
    VERIFY_OTP: "/verify-otp",
    FORGOT_PASSWORD: "/forgot-password",
    RESET_PASSWORD: "/reset-password",
    ADMIN_PRODUCTS: "/admin/products",
    ADMIN_DASHBOARD: "/admin/dashboard",
    ADMIN_ANALYTICS:"/admin/analytics",
    ADMIN_ORDERS:"/admin/orders",
    ADMIN_CUSTOMERS:"/admin/customers",
    ADMIN_SETTINGS:"/admin/settings"
}

export { ROUTES ,ROLES,getDefaultRouteForRole,getPostLoginRoute}
import { NavLink, useNavigate } from "react-router";
import { toast } from "react-toastify";
import { useAuth } from "../../Context/Authcontext.jsx";
import { getErrorMessage } from "../../Services/Api.js";
import { ROUTES } from "../../constants/routes.js";
import { FiX } from "react-icons/fi";
import analyticsIcon from "../../assets/admin/analytics.svg";
import collapseIcon from "../../assets/admin/collapse.svg";
import customersIcon from "../../assets/admin/customers.svg";
import dashboardIcon from "../../assets/admin/dashboard.svg";
import logo from "../../assets/admin/logo.png";
import logoutIcon from "../../assets/admin/logout.svg";
import ordersIcon from "../../assets/admin/orders.svg";
import productIcon from "../../assets/admin/product.svg";
import settingsIcon from "../../assets/admin/settings.svg";

const getInitials = (name = "") => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "A";

    return `${parts[0][0]}${parts.length > 1 ? parts[parts.length - 1][0] : ""}`
        .toUpperCase();
};

const navigationItems = [
    { label: "Dashboard", icon: dashboardIcon, to: ROUTES.ADMIN_DASHBOARD },
    { label: "Analytics", icon: analyticsIcon, to: ROUTES.ADMIN_ANALYTICS },
    { label: "Product", icon: productIcon, to: ROUTES.ADMIN_PRODUCTS },
    { label: "Orders", icon: ordersIcon, to: ROUTES.ADMIN_ORDERS },
    { label: "Customers", icon: customersIcon, to: ROUTES.ADMIN_CUSTOMERS },
    { label: "Settings", icon: settingsIcon, to: ROUTES.ADMIN_SETTINGS },
];

const Sidebar = ({
    collapsed = false,
    onToggleCollapse,
    onClose,
    onNavigate,
}) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate(ROUTES.LOGIN, { replace: true });
        } catch (error) {
            toast.error(getErrorMessage(error, "Could not log out."));
        }
    };

    return (
        <div className="flex h-full flex-col overflow-y-auto bg-white px-5 pb-5 pt-5 shadow-[0_3px_4px_0_rgba(0,0,0,0.12)]">
            <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-[#F3F1EF] px-0 py-3">
                {!collapsed && (
                    <img
                        src={logo}
                        alt="The Wax Studio"
                        className="h-15 w-16 object-contain"
                    />
                )}
                <button
                    type="button"
                    onClick={onToggleCollapse}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-expanded={!collapsed}
                    className="hidden h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md transition hover:bg-[#F3F1EF] focus-visible:outline-2 focus-visible:outline-[#957358] md:flex"
                >
                    <img
                        src={collapseIcon}
                        alt=""
                        className={`h-6 w-6 transition-transform ${collapsed ? "rotate-180" : ""}`}
                    />
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close admin navigation"
                    className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-xl text-[#4B5563] transition hover:bg-[#F3F1EF] focus-visible:outline-2 focus-visible:outline-[#957358] md:hidden"
                >
                    <FiX aria-hidden="true" />
                </button>
            </div>

            <nav
                aria-label="Admin navigation"
                className="mt-6 flex shrink-0 flex-col gap-4"
            >
                {navigationItems.map((item) => {
                    const itemContent = (
                        <>
                            <img
                                src={item.icon}
                                alt=""
                                className="h-6 w-6 shrink-0"
                            />
                            {!collapsed && (
                                <span className="truncate">{item.label}</span>
                            )}
                        </>
                    );

                    const className =
                        "flex h-[42px] w-full items-center gap-2 rounded-md px-4 text-left text-base leading-[22px] text-[#4B5563] transition-colors focus-visible:outline-2 focus-visible:outline-[#957358]";

                    return (
                        <NavLink
                            key={item.label}
                            to={item.to}
                            onClick={onNavigate}
                            title={collapsed ? item.label : undefined}
                            aria-label={item.label}
                            className={({ isActive }) =>
                                `${className} ${
                                    isActive
                                        ? "bg-[#947359] text-white"
                                        : "bg-white hover:bg-[#F3EDE8] hover:text-[#947359]"
                                }`
                            }
                        >
                            {itemContent}
                        </NavLink>
                    );
                })}
            </nav>

            <div
                className={`mt-auto flex min-h-16 shrink-0 items-center justify-between gap-3 rounded-lg border-t border-[#F3F1EF] bg-white py-3 ${
                    collapsed ? "flex-col" : ""
                }`}
            >
                <div className="flex min-w-0 items-center gap-3">
                    {user?.profilePicture ? (
                        <img
                            src={user.profilePicture}
                            alt={`${user?.name || "Admin"} profile photo`}
                            referrerPolicy="no-referrer"
                            className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                    ) : (
                        <div
                            aria-label={`${user?.name || "Admin"} initials`}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#947359] text-sm font-semibold text-white"
                        >
                            {getInitials(user?.name)}
                        </div>
                    )}
                    {!collapsed && (
                        <div className="min-w-0 text-sm leading-4">
                            <p className="truncate font-semibold text-[#1F2937]">
                                {user?.name || "Admin"}
                            </p>
                            <p className="mt-1 truncate text-[#737373]">
                                {user?.email || ""}
                            </p>
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={handleLogout}
                    title="Log out"
                    aria-label="Log out"
                    className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md transition hover:bg-[#F3F1EF] focus-visible:outline-2 focus-visible:outline-[#957358]"
                >
                    <img src={logoutIcon} alt="" className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

export { Sidebar };

import { useState } from "react";
import { Outlet } from "react-router";
import { FiMenu } from "react-icons/fi";
import { Navbar } from "../Pages/Admin/Navbar";
import { Sidebar } from "../Pages/Admin/sidebar";

const AdminLayout = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const sidebarWidth = sidebarCollapsed ? "80px" : "284px";

    return (
        <div
            className="min-h-dvh bg-[#FAFAFC]"
            style={{ "--admin-sidebar-width": sidebarWidth }}
        >
            {/* Navbar */}
            <header className="fixed left-0 right-0 top-0 z-50 flex h-20 items-center border-b border-[#EEEBE8] bg-white shadow-[0_4px_6px_-4px_rgba(0,0,0,0.15)] md:left-[var(--admin-sidebar-width)]">
                <button
                    type="button"
                    aria-label="Open admin navigation"
                    aria-expanded={mobileSidebarOpen}
                    onClick={() => setMobileSidebarOpen(true)}
                    className="ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xl text-[#2F2F2F] hover:bg-[#F3F1EF] focus-visible:outline-2 focus-visible:outline-[#957358] md:hidden"
                >
                    <FiMenu aria-hidden="true" />
                </button>
                <div className="min-w-0 flex-1">
                    <Navbar />
                </div>
            </header>

            {mobileSidebarOpen && (
                <button
                    type="button"
                    aria-label="Close admin navigation"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="fixed inset-0 z-[60] bg-black/40 md:hidden"
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed bottom-0 left-0 top-0 z-[70] w-[min(284px,85vw)] transition-transform duration-200 md:w-[var(--admin-sidebar-width)] md:translate-x-0 ${
                    mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <Sidebar
                    collapsed={sidebarCollapsed}
                    onToggleCollapse={() =>
                        setSidebarCollapsed((collapsed) => !collapsed)
                    }
                    onClose={() => setMobileSidebarOpen(false)}
                    onNavigate={() => setMobileSidebarOpen(false)}
                />
            </aside>

            {/* Main Content */}
            <main className="min-h-dvh pt-20 pb-16 md:ml-[var(--admin-sidebar-width)]">
                <div className="p-4 sm:p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export { AdminLayout };
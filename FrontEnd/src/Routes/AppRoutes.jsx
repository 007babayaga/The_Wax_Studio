import { Route, Routes } from "react-router";
import { ROUTES } from "../constants/routes";
import { SignUp } from "../Pages/Auth/SignUp";
import { Login } from "../Pages/Auth/Login";
import { GuestRoute, RequireAdmin } from "./Guards";
import { AdminLayout } from "../Layouts/AdminLayout";
import { Product } from "../Pages/Admin/Products";
import { AdminDashboard } from "../Pages/Admin/AdminDashboard";
import { Analytics } from "../Pages/Admin/Analytics";
import { Orders } from "../Pages/Admin/Orders";
import { Customers } from "../Pages/Admin/Customers";
import { Settings } from "../Pages/Admin/Settings";
import { AddProduct } from "../Pages/Admin/AddProduct";
import { ViewProduct } from "../Pages/Admin/ViewProduct";
import { EditProduct } from "../Pages/Admin/EditProduct";


const AppRoutes = () => {
    return ( 
        <Routes>
            <Route element={<GuestRoute />}>
                <Route path={ROUTES.LOGIN} element={<Login />} />
                <Route path={ROUTES.SIGNUP} element={<SignUp />} />
            </Route>
            <Route element={<RequireAdmin />}>
                <Route element={<AdminLayout />}>
                    <Route path={ROUTES.ADMIN_DASHBOARD} element={<AdminDashboard />} />
                    <Route path={ROUTES.ADMIN_ANALYTICS} element={<Analytics />} />

                    <Route path={ROUTES.ADMIN_PRODUCTS}>
                        <Route index element={<Product />} />                       {/* list */}
                        <Route path="add" element={<AddProduct />} />               {/* /products/add */}
                        <Route path=":productId" element={<ViewProduct />} />       {/* /products/42 */}
                        <Route path=":productId/edit" element={<EditProduct />} />  {/* /products/42/edit */}
                    </Route>

                    <Route path={ROUTES.ADMIN_ORDERS} element={<Orders />} />
                    <Route path={ROUTES.ADMIN_CUSTOMERS} element={<Customers />} />
                    <Route path={ROUTES.ADMIN_SETTINGS} element={<Settings />} />
                </Route>
            </Route>
        </Routes>
    );
};

export { AppRoutes };
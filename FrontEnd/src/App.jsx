import { ToastContainer } from "react-toastify";
import { AppRoutes } from "./Routes/AppRoutes";
import { useFaviconRefresh } from "./hooks/useFaviconRefresh";

const App = () => {
    useFaviconRefresh();

    return (
        <>
            <AppRoutes />
            <ToastContainer
                position="top-center"
                autoClose={2000}
                theme="light"
            />
        </>
    );
};

export { App };

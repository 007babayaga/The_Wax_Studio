import { ToastContainer } from "react-toastify";
import { AppRoutes } from "./Routes/AppRoutes";

const App = () => (
    <>
        <AppRoutes />
        <ToastContainer
            position="top-center"
            autoClose={2000}
            theme="light"
        />
    </>
);

export { App };

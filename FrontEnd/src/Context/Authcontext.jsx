import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import { getCurrentUser, logoutUser } from "../Services/AuthService.js";
import { SESSION_EXPIRED_EVENT } from "../Services/Api.js";

const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    // True until the first session check finishes, so route guards don't
    // redirect to /login while we are still restoring the session on refresh.
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        const restoreSession = async () => {
            try {
                const currentUser = await getCurrentUser({
                    signal: controller.signal,
                });

                setUser(currentUser);
            } catch (error) {
                if (error?.name === "AbortError") return;
                setUser(null);
            } finally {
                if (!controller.signal.aborted) {
                    setInitializing(false);
                }
            }
        };

        restoreSession();

        return () => controller.abort();
    }, []);

    // apiFetch fires this when the refresh token is rejected mid-session.
    // Clearing the user lets the route guards send the person to /login.
    useEffect(() => {
        const handleSessionExpired = () => setUser(null);

        window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);

        return () => {
            window.removeEventListener(
                SESSION_EXPIRED_EVENT,
                handleSessionExpired
            );
        };
    }, []);

    const login = useCallback((authenticatedUser) => {
        if (!authenticatedUser || typeof authenticatedUser.role !== "string") {
            throw new Error("Invalid user returned from login");
        }

        setUser(authenticatedUser);
    }, []);

    // Merge changed fields (e.g. a new profilePicture) into the signed-in user.
    const updateUser = useCallback((fields) => {
        setUser((current) => (current ? { ...current, ...fields } : current));
    }, []);

    const logout = useCallback(async () => {
        try {
            await logoutUser();
        } finally {
            // Always clear local state, even if the network call fails.
            setUser(null);
        }
    }, []);

    // Drops the signed-in user without calling the API, for when the server
    // already ended the session (e.g. the account was deleted).
    const clearSession = useCallback(() => setUser(null), []);

    const value = useMemo(
        () => ({ user, initializing, login, logout, updateUser, clearSession }),
        [user, initializing, login, logout, updateUser, clearSession]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside an AuthProvider");
    }

    return context;
};

export { AuthProvider, useAuth };
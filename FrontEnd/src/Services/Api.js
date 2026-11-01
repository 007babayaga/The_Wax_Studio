const rawBaseURL =
    import.meta.env.VITE_API_URL ??
    (import.meta.env.DEV
        ? "http://localhost:5400/api/v1"
        : undefined);

if (!rawBaseURL) {
    throw new Error("VITE_API_URL is not set. Add it to your .env file.");
}

const BASE_URL = rawBaseURL.replace(/\/+$/, "");
const TIMEOUT_MS = 15000;
const REFRESH_PATH = "/auth/refreshToken";

// Fired when the refresh token is rejected; AuthContext listens and logs out.
export const SESSION_EXPIRED_EVENT = "auth:session-expired";

export class ApiError extends Error {
    constructor(message, status = 0, data = null) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.data = data;
    }
}

const buildQuery = (params = {}) => {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            query.append(key, value);
        }
    });

    return query.toString() ? `?${query.toString()}` : "";
};

// One network attempt: its own timeout, optional caller-supplied signal.
const send = async (
    path,
    {
        method = "GET",
        body,
        headers = {},
        signal: externalSignal,
    } = {}
) => {
    const controller = new AbortController();
    const abortFromCaller = () => controller.abort();

    if (externalSignal) {
        if (externalSignal.aborted) {
            controller.abort();
        } else {
            externalSignal.addEventListener("abort", abortFromCaller, {
                once: true,
            });
        }
    }

    const timer = setTimeout(() => {
        controller.abort();
    }, TIMEOUT_MS);

    const hasBody = body !== undefined;
    const isFormData = body instanceof FormData;

    try {
        const response = await fetch(`${BASE_URL}${path}`, {
            method,
            credentials: "include",
            headers: {
                ...(hasBody &&
                    !isFormData && {
                    "Content-Type": "application/json",
                }),
                ...headers,
            },
            body: hasBody
                ? isFormData
                    ? body
                    : JSON.stringify(body)
                : undefined,
            signal: controller.signal,
        });

        const text = await response.text();

        let data = null;

        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                data = text;
            }
        }

        if (!response.ok) {
            throw new ApiError(
                data?.message || `Request failed (${response.status})`,
                response.status,
                data
            );
        }

        return data;
    } catch (err) {
        if (err instanceof ApiError) {
            throw err;
        }

        if (err?.name === "AbortError") {
            // Cancelled by the caller (e.g. component unmounted): not a timeout.
            if (externalSignal?.aborted) {
                throw err;
            }

            throw new ApiError(
                "The request timed out. Please try again.",
                408
            );
        }

        if (!navigator.onLine) {
            throw new ApiError(
                "No internet connection.",
                0
            );
        }

        throw new ApiError(
            "Cannot reach the server. Please try again.",
            0
        );
    } finally {
        clearTimeout(timer);
        externalSignal?.removeEventListener("abort", abortFromCaller);
    }
};

// Concurrent 401s share one refresh call, so the (rotated) refresh token is
// never used twice at the same time.
let refreshPromise = null;

const refreshSession = () => {
    if (!refreshPromise) {
        refreshPromise = (async () => {
            try {
                await send(REFRESH_PATH, { method: "POST" });
                return true;
            } catch (err) {
                // Refresh token invalid or expired: the session is over.
                if (
                    err instanceof ApiError &&
                    (err.status === 401 || err.status === 403)
                ) {
                    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
                }

                // Network errors and timeouts are not an expired session.
                return false;
            } finally {
                refreshPromise = null;
            }
        })();
    }

    return refreshPromise;
};

/**
 * Options (last argument of every api.* method):
 *  - skipRefresh: true  -> a 401 is a normal answer (login, signup, OTP,
 *                          logout), so never try to refresh and retry.
 *  - signal             -> AbortSignal to cancel the request.
 */
const request = async (path, options = {}) => {
    const { skipRefresh = false, ...sendOptions } = options;

    try {
        return await send(path, sendOptions);
    } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 401 || skipRefresh) {
            throw err;
        }

        const refreshed = await refreshSession();

        if (!refreshed) {
            throw err;
        }

        return send(path, sendOptions);
    }
};

export const api = {
    get: (path, params = {}, options = {}) =>
        request(`${path}${buildQuery(params)}`, options),

    post: (path, body, options = {}) =>
        request(path, {
            ...options,
            method: "POST",
            body,
        }),

    put: (path, body, options = {}) =>
        request(path, {
            ...options,
            method: "PUT",
            body,
        }),

    patch: (path, body, options = {}) =>
        request(path, {
            ...options,
            method: "PATCH",
            body,
        }),

    delete: (path, options = {}) =>
        request(path, {
            ...options,
            method: "DELETE",
        }),
};

export const getErrorMessage = (
    err,
    fallback = "Something went wrong. Please try again."
) => {
    return err instanceof ApiError && err.message
        ? err.message
        : fallback;
};
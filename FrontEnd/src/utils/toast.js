import { toast as baseToast } from "react-toastify";

// react-toastify ignores a new toast whose toastId matches one already on screen.
// Deriving the id from type + message stops rapid repeat clicks from stacking
// identical toasts, while different messages still show normally.
const getToastId = (type, message) =>
    typeof message === "string" ? `${type}:${message}` : undefined;

const withDedupe = (type, show) => (message, options = {}) =>
    show(message, { toastId: getToastId(type, message), ...options });

const toast = Object.assign(
    withDedupe("default", baseToast),
    baseToast,
    {
        success: withDedupe("success", baseToast.success),
        error: withDedupe("error", baseToast.error),
        info: withDedupe("info", baseToast.info),
        warn: withDedupe("warn", baseToast.warn),
        warning: withDedupe("warning", baseToast.warning),
    }
);

export { toast };

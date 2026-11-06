import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { toast } from "../../utils/toast.js";

import {
    PasswordMatchHint,
    PasswordRequirements,
} from "../../Components/UI/PasswordRequirements.jsx";
import {
    isPasswordValid,
    PASSWORD_MAX_LENGTH,
} from "../../constants/passwordRules.js";
import { ApiError, getErrorMessage } from "../../Services/Api.js";
import { forgotPassword, resetPassword } from "../../Services/AuthService.js";
import { ROUTES } from "../../constants/routes.js";
import { OTP_LENGTH, OTP_REGEX, sanitizeOtp } from "../../constants/otp.js";

const RESEND_COOLDOWN_SECONDS = 120; // keep in sync with the backend OTP cooldown

const LABEL_CLASS =
    "mb-1.5 block text-xs uppercase tracking-widest text-[#6B6B6B] font-bold";

const INPUT_CLASS =
    "w-full border border-[#E5E2DF] bg-white px-4 py-2.5 text-sm text-[#2F2F2F] placeholder-[#9DA3AA] outline-none transition-all focus:border-[#957358] focus:ring-2 focus:ring-[#957358]/20 read-only:bg-[#F8F8F8]";

const BUTTON_CLASS =
    "w-full cursor-pointer rounded-lg bg-[#957351] py-2.5 text-sm font-semibold tracking-widest text-white transition hover:bg-[#84654C] disabled:cursor-not-allowed disabled:opacity-70";

const LINK_BUTTON_CLASS =
    "w-full cursor-pointer text-sm font-medium text-[#644429] transition hover:text-[#84654C] disabled:cursor-not-allowed disabled:opacity-60";

const TOGGLE_BUTTON_CLASS =
    "absolute inset-y-0 right-3 cursor-pointer text-sm font-medium text-[#644429] hover:text-[#84654C]";

const ResetPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || "";

    const [loading, setLoading] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
    const [resendSeconds, setResendSeconds] = useState(
        location.state?.retryAfterSeconds || RESEND_COOLDOWN_SECONDS
    );
    const [form, setForm] = useState({
        otp: "",
        newPassword: "",
        confirmPassword: "",
    });

    // Resend-OTP cooldown timer.
    useEffect(() => {
        if (resendSeconds <= 0) return undefined;

        const timerId = setTimeout(() => {
            setResendSeconds((seconds) => seconds - 1);
        }, 1000);

        return () => clearTimeout(timerId);
    }, [resendSeconds]);

    // Opened directly (or after a refresh) without an email to reset.
    if (!email) {
        return <Navigate to={ROUTES.FORGOT_PASSWORD} replace />;
    }

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((previous) => ({
            ...previous,
            [name]: name === "otp" ? sanitizeOtp(value) : value,
        }));
    };

    const handleResendOtp = async () => {
        if (loading || resendSeconds > 0) return;

        try {
            setLoading(true);
            const response = await forgotPassword({ email });
            setResendSeconds(RESEND_COOLDOWN_SECONDS);
            setForm((previous) => ({ ...previous, otp: "" }));
            toast.success(response?.message || "OTP sent to your email");
        } catch (error) {
            if (error instanceof ApiError && error.status === 429) {
                setResendSeconds(
                    Number(error.data?.retryAfterSeconds) || RESEND_COOLDOWN_SECONDS
                );
            }
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (loading) return;

        if (!OTP_REGEX.test(form.otp)) {
            toast.error(`Please enter the ${OTP_LENGTH}-digit OTP`);
            return;
        }

        if (!isPasswordValid(form.newPassword)) {
            toast.error("Password does not meet all the requirements");
            return;
        }

        if (form.newPassword !== form.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        try {
            setLoading(true);
            const response = await resetPassword({
                email,
                otp: form.otp,
                newPassword: form.newPassword,
            });
            toast.success(response?.message || "Password reset successfully");

            // The component unmounts on navigation, which discards both
            // passwords from memory.
            navigate(ROUTES.LOGIN, { replace: true });
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="flex min-h-dvh items-center justify-center bg-[#FAFAFC] px-4 py-6 sm:px-6 sm:py-10">
            <div className="w-full max-w-md rounded-b-sm border border-[#EEEBE8] bg-white p-5 shadow-sm sm:p-8">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-[#2F2F2F] sm:text-3xl">
                        Reset Password
                    </h1>
                    <p className="mt-2 text-sm text-[#6B6B6B]">
                        Enter the code sent to your email and choose a new password.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="reset-email" className={LABEL_CLASS}>
                            Email
                        </label>
                        <input
                            id="reset-email"
                            value={email}
                            readOnly
                            tabIndex={-1}
                            className={INPUT_CLASS}
                        />
                    </div>

                    <div>
                        <label htmlFor="otp" className={LABEL_CLASS}>
                            Verification Code
                        </label>
                        <input
                            id="otp"
                            name="otp"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={OTP_LENGTH}
                            pattern={`\\d{${OTP_LENGTH}}`}
                            value={form.otp}
                            onChange={handleChange}
                            placeholder={`Enter ${OTP_LENGTH}-digit OTP`}
                            className={INPUT_CLASS}
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="newPassword" className={LABEL_CLASS}>
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                id="newPassword"
                                name="newPassword"
                                type={passwordVisible ? "text" : "password"}
                                autoComplete="new-password"
                                value={form.newPassword}
                                onChange={handleChange}
                                placeholder="Create a new password"
                                maxLength={PASSWORD_MAX_LENGTH}
                                aria-describedby="new-password-requirements"
                                className={`${INPUT_CLASS} pr-20`}
                                required
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    setPasswordVisible((visible) => !visible)
                                }
                                aria-label={
                                    passwordVisible
                                        ? "Hide password"
                                        : "Show password"
                                }
                                aria-pressed={passwordVisible}
                                className={TOGGLE_BUTTON_CLASS}
                            >
                                {passwordVisible ? "Hide" : "Show"}
                            </button>
                        </div>
                        <PasswordRequirements
                            id="new-password-requirements"
                            password={form.newPassword}
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className={LABEL_CLASS}>
                            Confirm Password
                        </label>
                        <div className="relative">
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={confirmPasswordVisible ? "text" : "password"}
                                autoComplete="new-password"
                                value={form.confirmPassword}
                                onChange={handleChange}
                                placeholder="Confirm your new password"
                                maxLength={PASSWORD_MAX_LENGTH}
                                className={`${INPUT_CLASS} pr-20`}
                                required
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    setConfirmPasswordVisible((visible) => !visible)
                                }
                                aria-label={
                                    confirmPasswordVisible
                                        ? "Hide confirm password"
                                        : "Show confirm password"
                                }
                                aria-pressed={confirmPasswordVisible}
                                className={TOGGLE_BUTTON_CLASS}
                            >
                                {confirmPasswordVisible ? "Hide" : "Show"}
                            </button>
                        </div>
                        <PasswordMatchHint
                            password={form.newPassword}
                            confirmPassword={form.confirmPassword}
                        />
                    </div>

                    <button
                        type="submit"
                        className={BUTTON_CLASS}
                        disabled={loading}
                    >
                        {loading ? "Resetting..." : "Reset Password"}
                    </button>

                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={loading || resendSeconds > 0}
                            className={LINK_BUTTON_CLASS}
                        >
                            {resendSeconds > 0
                                ? `Resend OTP in ${resendSeconds}s`
                                : "Resend OTP"}
                        </button>

                        <Link
                            to={ROUTES.FORGOT_PASSWORD}
                            replace
                            className={`${LINK_BUTTON_CLASS} block text-center`}
                        >
                            Change Email
                        </Link>
                    </div>
                </form>

                <p className="mt-5 text-center text-sm text-[#6B6B6B]">
                    Remembered your password?{" "}
                    <Link
                        to={ROUTES.LOGIN}
                        className="font-semibold text-[#644429] hover:text-[#84654C]"
                    >
                        Login
                    </Link>
                </p>
            </div>
        </section>
    );
};

export { ResetPassword };

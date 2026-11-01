import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router";
import { GoogleAuthButton } from "../../Components/UI/GoogleAuthButton.jsx";
import { useAuth } from "../../Context/Authcontext.jsx";

import {
    sendEmailOtp,
    verifyEmailOtp,
    signUpUser,
} from "../../Services/AuthService.js";

import { getErrorMessage } from "../../Services/Api.js";
import { getPostLoginRoute, ROUTES } from "../../constants/routes.js";

const MIN_PASSWORD_LENGTH = 6;
const MIN_DATE_OF_BIRTH = "1900-01-01";
const RESEND_COOLDOWN_SECONDS = 30;

// Google Identity Services only accepts button widths between 200 and 400px.
const GOOGLE_BUTTON_MIN_WIDTH = 200;
const GOOGLE_BUTTON_MAX_WIDTH = 400;

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

// Local-date YYYY-MM-DD (toISOString would shift the day for non-UTC users).
const getTodayString = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${now.getFullYear()}-${month}-${day}`;
};

const isValidDateOfBirth = (value) => {
    if (!value) return false;

    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return false;

    // ISO date strings compare correctly as plain strings.
    return value >= MIN_DATE_OF_BIRTH && value <= getTodayString();
};

const ReadOnlyField = ({ id, label, value }) => (
    <div>
        <label htmlFor={id} className={LABEL_CLASS}>
            {label}
        </label>

        <input
            id={id}
            value={value}
            readOnly
            tabIndex={-1}
            className={INPUT_CLASS}
        />
    </div>
);

const SignUp = () => {
    const [step, setStep] = useState("details");
    const [loading, setLoading] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
    const [googleButtonWidth, setGoogleButtonWidth] = useState(320);
    const [resendSeconds, setResendSeconds] = useState(0);
    const googleButtonContainerRef = useRef(null);
    const navigate = useNavigate();
    const { login } = useAuth();

    const [form, setForm] = useState({
        name: "",
        email: "",
        dateOfBirth: "",
        password: "",
        confirmPassword: "",
    });

    const [otp, setOtp] = useState("");

    // The Google button container only exists on the "details" step, so the
    // observer has to be re-attached whenever the step changes.
    useEffect(() => {
        const container = googleButtonContainerRef.current;

        if (
            step !== "details" ||
            !container ||
            typeof ResizeObserver === "undefined"
        ) {
            return undefined;
        }

        const observer = new ResizeObserver(([entry]) => {
            if (!entry) return;

            const width = Math.floor(entry.contentRect.width);

            setGoogleButtonWidth(
                Math.min(
                    GOOGLE_BUTTON_MAX_WIDTH,
                    Math.max(GOOGLE_BUTTON_MIN_WIDTH, width)
                )
            );
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, [step]);

    // Resend-OTP cooldown timer.
    useEffect(() => {
        if (resendSeconds <= 0) return undefined;

        const timerId = setTimeout(() => {
            setResendSeconds((seconds) => seconds - 1);
        }, 1000);

        return () => clearTimeout(timerId);
    }, [resendSeconds]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Validates, normalizes and sends the OTP. Returns true when the OTP was sent.
    const sendOtp = async () => {
        const name = form.name.trim();
        const email = form.email.trim().toLowerCase();

        if (!name) {
            toast.error("Please enter your full name");
            return false;
        }

        if (!email) {
            toast.error("Please enter your email address");
            return false;
        }

        if (!isValidDateOfBirth(form.dateOfBirth)) {
            toast.error("Please enter a valid date of birth");
            return false;
        }

        try {
            setLoading(true);

            const response = await sendEmailOtp({
                name,
                email,
                dateOfBirth: form.dateOfBirth,
            });

            // Keep the normalized values so every later step uses the same ones.
            setForm((prev) => ({ ...prev, name, email }));
            setResendSeconds(RESEND_COOLDOWN_SECONDS);

            toast.success(response?.message || "OTP sent successfully");
            return true;
        } catch (error) {
            toast.error(getErrorMessage(error));
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (loading) return;

        const sent = await sendOtp();

        if (sent) {
            setOtp("");
            setStep("otp");
        }
    };

    const handleResendOtp = async () => {
        if (loading || resendSeconds > 0) return;

        const sent = await sendOtp();

        if (sent) {
            setOtp("");
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (loading) return;

        const trimmedOtp = otp.trim();

        if (!trimmedOtp) {
            toast.error("Please enter OTP");
            return;
        }

        try {
            setLoading(true);

            const response = await verifyEmailOtp({
                email: form.email,
                otp: trimmedOtp,
            });

            toast.success(response?.message || "OTP verified successfully");

            setStep("password");
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        if (loading) return;

        if (form.password.length < MIN_PASSWORD_LENGTH) {
            toast.error(
                `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
            );
            return;
        }

        if (form.password !== form.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        try {
            setLoading(true);

            const response = await signUpUser({
                name: form.name,
                email: form.email,
                dateOfBirth: form.dateOfBirth,
                password: form.password,
            });

            toast.success(response?.message || "Account created successfully");

            // The component unmounts on navigation, which discards the form
            // (including both passwords) from memory.
            navigate(ROUTES.LOGIN, { replace: true });
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handleChangeEmail = () => {
        setOtp("");
        setStep("details");
    };

    return (
        <section className="flex min-h-dvh items-center justify-center bg-[#FAFAFC] px-4 py-6 sm:px-6 sm:py-10">
            <div className="w-full max-w-md rounded-b-sm border border-[#EEEBE8] bg-white p-5 shadow-sm sm:p-8">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-[#2F2F2F] sm:text-3xl">
                        Create Account
                    </h1>
                </div>

                {/* STEP 1 : USER DETAILS */}
                {step === "details" && (
                    <>
                        <form onSubmit={handleSendOtp} className="space-y-5">
                            <div>
                                <label htmlFor="name" className={LABEL_CLASS}>
                                    Full Name
                                </label>

                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    autoComplete="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="Enter your full name"
                                    className={INPUT_CLASS}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className={LABEL_CLASS}>
                                    Email Address
                                </label>

                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="you@example.com"
                                    className={INPUT_CLASS}
                                    required
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="dateOfBirth"
                                    className={LABEL_CLASS}
                                >
                                    Date Of Birth
                                </label>

                                <input
                                    id="dateOfBirth"
                                    name="dateOfBirth"
                                    type="date"
                                    autoComplete="bday"
                                    value={form.dateOfBirth}
                                    onChange={handleChange}
                                    min={MIN_DATE_OF_BIRTH}
                                    max={getTodayString()}
                                    className={INPUT_CLASS}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className={BUTTON_CLASS}
                                disabled={loading}
                            >
                                {loading ? "Sending OTP..." : "Send OTP"}
                            </button>
                        </form>

                        {/* Kept outside the form so it can never trigger the OTP submit. */}
                        <div className="mt-5 space-y-5">
                            <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-[#9DA3AA]">
                                <span className="h-px flex-1 bg-[#E5E2DF]" />
                                <span>or</span>
                                <span className="h-px flex-1 bg-[#E5E2DF]" />
                            </div>

                            <div ref={googleButtonContainerRef} className="w-full">
                                <GoogleAuthButton
                                    width={googleButtonWidth}
                                    disabled={loading}
                                    onSuccess={(user) => {
                                        login(user);
                                        navigate(getPostLoginRoute(user.role), {
                                            replace: true,
                                        });
                                    }}
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* STEP 2 : OTP VERIFICATION */}
                {step === "otp" && (
                    <form onSubmit={handleVerifyOtp} className="space-y-5">
                        <ReadOnlyField
                            id="otp-name"
                            label="Full Name"
                            value={form.name}
                        />

                        <ReadOnlyField
                            id="otp-email"
                            label="Email"
                            value={form.email}
                        />

                        <div>
                            <label htmlFor="otp" className={LABEL_CLASS}>
                                Verification Code
                            </label>

                            <input
                                id="otp"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                value={otp}
                                onChange={(e) =>
                                    setOtp(e.target.value.replace(/\D/g, ""))
                                }
                                placeholder="Enter OTP"
                                className={INPUT_CLASS}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className={BUTTON_CLASS}
                            disabled={loading}
                        >
                            {loading ? "Verifying..." : "Verify OTP"}
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

                            <button
                                type="button"
                                onClick={handleChangeEmail}
                                disabled={loading}
                                className={LINK_BUTTON_CLASS}
                            >
                                Change Email
                            </button>
                        </div>
                    </form>
                )}

                {/* STEP 3 : PASSWORD CREATION */}
                {step === "password" && (
                    <form onSubmit={handleSignUp} className="space-y-5">
                        <ReadOnlyField
                            id="password-name"
                            label="Full Name"
                            value={form.name}
                        />

                        <ReadOnlyField
                            id="password-email"
                            label="Email"
                            value={form.email}
                        />

                        <ReadOnlyField
                            id="password-dob"
                            label="Date Of Birth"
                            value={form.dateOfBirth}
                        />

                        <div>
                            <label htmlFor="password" className={LABEL_CLASS}>
                                Password
                            </label>

                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={passwordVisible ? "text" : "password"}
                                    autoComplete="new-password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="Create a password"
                                    minLength={MIN_PASSWORD_LENGTH}
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
                        </div>

                        <div>
                            <label
                                htmlFor="confirmPassword"
                                className={LABEL_CLASS}
                            >
                                Confirm Password
                            </label>

                            <div className="relative">
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={
                                        confirmPasswordVisible
                                            ? "text"
                                            : "password"
                                    }
                                    autoComplete="new-password"
                                    value={form.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Confirm your password"
                                    className={`${INPUT_CLASS} pr-20`}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setConfirmPasswordVisible(
                                            (visible) => !visible
                                        )
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
                        </div>

                        <button
                            type="submit"
                            className={BUTTON_CLASS}
                            disabled={loading}
                        >
                            {loading ? "Creating Account..." : "Create Account"}
                        </button>
                    </form>
                )}
            </div>
        </section>
    );
};

export { SignUp };
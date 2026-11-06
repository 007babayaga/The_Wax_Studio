import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "../../utils/toast.js";

import { ApiError, getErrorMessage } from "../../Services/Api.js";
import { forgotPassword } from "../../Services/AuthService.js";
import { ROUTES } from "../../constants/routes.js";

const LABEL_CLASS =
    "mb-1.5 block text-xs uppercase tracking-widest text-[#6B6B6B] font-bold";

const INPUT_CLASS =
    "w-full border border-[#E5E2DF] bg-white px-4 py-2.5 text-sm text-[#2F2F2F] placeholder-[#9DA3AA] outline-none transition-all focus:border-[#957358] focus:ring-2 focus:ring-[#957358]/20";

const BUTTON_CLASS =
    "w-full cursor-pointer rounded-lg bg-[#957351] py-2.5 text-sm font-semibold tracking-widest text-white transition hover:bg-[#84654C] disabled:cursor-not-allowed disabled:opacity-70";

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (loading) return;

        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) {
            toast.error("Please enter your email address");
            return;
        }

        try {
            setLoading(true);
            const response = await forgotPassword({ email: normalizedEmail });
            toast.success(response?.message || "OTP sent to your email");
            navigate(ROUTES.RESET_PASSWORD, { state: { email: normalizedEmail } });
        } catch (error) {
            // 429 = an OTP was sent less than the cooldown ago and is still
            // valid, so let the user continue with that one.
            if (error instanceof ApiError && error.status === 429) {
                toast.info("An OTP was already sent to your email. Please use that one.");
                navigate(ROUTES.RESET_PASSWORD, {
                    state: {
                        email: normalizedEmail,
                        retryAfterSeconds: Number(error.data?.retryAfterSeconds) || 0,
                    },
                });
                return;
            }

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
                        Forgot Password
                    </h1>
                    <p className="mt-2 text-sm text-[#6B6B6B]">
                        Enter your email and we&apos;ll send you a code to reset your password.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="email" className={LABEL_CLASS}>
                            Email Address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="you@example.com"
                            className={INPUT_CLASS}
                            autoComplete="email"
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

export { ForgotPassword };

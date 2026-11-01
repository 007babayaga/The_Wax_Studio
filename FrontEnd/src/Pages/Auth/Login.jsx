import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { toast } from "react-toastify";

import { GoogleAuthButton } from "../../Components/UI/GoogleAuthButton.jsx";
import { useAuth } from "../../Context/Authcontext.jsx";
import { getErrorMessage } from "../../Services/Api.js";
import { loginUser } from "../../Services/AuthService.js";
import { getPostLoginRoute } from "../../constants/routes.js";

const LABEL_CLASS =
    "mb-1.5 block text-xs uppercase tracking-widest text-[#6B6B6B] font-bold";

const INPUT_CLASS =
    "w-full border border-[#E5E2DF] bg-gray px-4 py-2.5 text-sm text-[#2F2F2F] placeholder-[#9DA3AA] outline-none transition-all focus:border-[#957358] focus:ring-2 focus:ring-[#957358]/20";

const BUTTON_CLASS =
    "w-full cursor-pointer rounded-lg bg-[#957351] py-2.5 text-sm font-semibold tracking-widest text-white transition hover:bg-[#84654C] disabled:cursor-not-allowed disabled:opacity-70";

const GOOGLE_BUTTON_MIN_WIDTH = 200;
const GOOGLE_BUTTON_MAX_WIDTH = 400;

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [googleButtonWidth, setGoogleButtonWidth] = useState(320);
    const googleButtonContainerRef = useRef(null);
    const [form, setForm] = useState({ email: "", password: "" });

    useEffect(() => {
        const container = googleButtonContainerRef.current;
        if (!container || typeof ResizeObserver === "undefined") return;

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
    }, []);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((previous) => ({ ...previous, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            setLoading(true);
            const response = await loginUser(form);
            login(response?.user);
            toast.success(response?.message || "Logged in successfully");
            navigate(
                getPostLoginRoute(response.user.role, location.state?.from),
                { replace: true }
            );
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
                        Login
                    </h1>
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
                            value={form.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                            className={INPUT_CLASS}
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className={LABEL_CLASS}>
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type={passwordVisible ? "text" : "password"}
                                value={form.password}
                                onChange={handleChange}
                                placeholder="Enter your password"
                                className={`${INPUT_CLASS} pr-20`}
                                autoComplete="current-password"
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
                                className="absolute inset-y-0 right-3 text-sm font-medium text-[#644429] hover:text-[#84654C]"
                            >
                                {passwordVisible ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className={BUTTON_CLASS}
                        disabled={loading}
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>

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
                </form>

                <p className="mt-5 text-center text-sm text-[#6B6B6B]">
                    Don&apos;t have an account?{" "}
                    <Link
                        to="/signup"
                        className="font-semibold text-[#644429] hover:text-[#84654C]"
                    >
                        Sign up
                    </Link>
                </p>
            </div>
        </section>
    );
};

export { Login };

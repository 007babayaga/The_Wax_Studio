import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "../../utils/toast.js";
import {
    LuBell,
    LuBriefcase,
    LuCamera,
    LuCheck,
    LuChevronDown,
    LuEye,
    LuEyeOff,
    LuLoaderCircle,
    LuMail,
    LuMessageCircle,
    LuShieldCheck,
    LuTrash2,
    LuUser,
    LuX,
} from "react-icons/lu";

import { useAuth } from "../../Context/Authcontext.jsx";
import {
    deleteAccount,
    updateProfile,
    uploadProfilePicture,
} from "../../Services/AuthService.js";
import { getErrorMessage } from "../../Services/Api.js";
import { ROUTES } from "../../constants/routes.js";

// Must match the backend limits on PUT /auth/profilePicture.
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_SIZE = 2 * 1024 * 1024;

const TABS = [
    { id: "profile", label: "Profile", icon: LuUser },
    { id: "business", label: "Business Info", icon: LuBriefcase },
    { id: "security", label: "Security", icon: LuShieldCheck },
];

const NOTIFICATION_OPTIONS = [
    { id: "email", label: "Email Notifications", icon: LuMail },
    { id: "push", label: "Push Notifications", icon: LuBell },
    { id: "sms", label: "SMS Notifications", icon: LuMessageCircle },
];

const inputClassName =
    "h-12 w-full rounded-xl border border-[#E2E8F0] bg-white px-5 text-base text-[#111827] outline-none transition placeholder:text-[#94A3B8] focus:border-[#957358] focus:ring-2 focus:ring-[#957358]/15";

const cardClassName =
    "rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.12)] sm:p-8";

const getInitials = (name = "") => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "A";

    return `${parts[0][0]}${parts.length > 1 ? parts[parts.length - 1][0] : ""}`
        .toUpperCase();
};

const Toggle = ({ checked, onChange, label, disabled = false }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition cursor-pointer disabled:cursor-wait disabled:opacity-70 ${
            checked ? "bg-[#0A84FF]" : "bg-[#E5E7EB]"
        }`}
    >
        <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
                checked ? "left-7" : "left-1"
            }`}
        />
    </button>
);

const ProfilePhoto = ({ user, onUploaded }) => {
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
            toast.error("Please choose a JPG, PNG or WEBP image.");
            return;
        }
        if (file.size > MAX_PHOTO_SIZE) {
            toast.error("Profile photo must be 2 MB or smaller.");
            return;
        }

        setIsUploading(true);
        try {
            const response = await uploadProfilePicture(file);
            onUploaded(response.profilePicture);
            toast.success("Profile photo updated.");
        } catch (error) {
            toast.error(getErrorMessage(error, "Could not upload profile photo."));
        } finally {
            setIsUploading(false);
        }
    };

    const openFilePicker = () => fileInputRef.current?.click();

    return (
        <div className="flex flex-wrap items-center gap-6">
            <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_PHOTO_TYPES.join(",")}
                onChange={handleFileChange}
                className="sr-only"
                aria-label="Upload profile photo"
            />

            <div className="relative h-24 w-24 shrink-0">
                {user?.profilePicture ? (
                    <img
                        src={user.profilePicture}
                        alt={`${user?.name || "Admin"} profile photo`}
                        referrerPolicy="no-referrer"
                        className="h-full w-full rounded-full object-cover"
                    />
                ) : (
                    <span className="flex h-full w-full items-center justify-center rounded-full bg-[#E5E7EB] text-3xl font-semibold text-white">
                        {getInitials(user?.name)}
                    </span>
                )}
                {isUploading && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-2xl text-white">
                        <LuLoaderCircle
                            className="animate-spin"
                            aria-hidden="true"
                        />
                    </span>
                )}
                <button
                    type="button"
                    onClick={openFilePicker}
                    disabled={isUploading}
                    aria-label="Change profile photo"
                    className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-[#0A84FF] text-sm text-white transition hover:bg-[#0670DB] disabled:opacity-60 cursor-pointer"
                >
                    <LuCamera aria-hidden="true" />
                </button>
            </div>

            <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-black">
                    {user?.name || "Admin"}
                </p>
                <p className="truncate text-base text-[#94A3B8]">
                    {user?.email || ""}
                </p>
                <button
                    type="button"
                    onClick={openFilePicker}
                    disabled={isUploading}
                    className="mt-3 rounded-lg border border-[#E2E8F0] bg-white px-5 py-2 text-base font-medium text-black shadow-[0_1px_1px_rgba(0,0,0,0.05)] transition hover:bg-[#F8FAFC] disabled:cursor-wait disabled:opacity-60 cursor-pointer"
                >
                    {isUploading ? "Uploading…" : "Change Photo"}
                </button>
            </div>
        </div>
    );
};

const ProfileSettings = ({ user, onUserUpdated }) => {
    const [form, setForm] = useState({
        name: user?.name ?? "",
        countryCode: user?.phone?.countryCode || "+91",
        phone: user?.phone?.number ?? "",
    });
    const [isSaving, setIsSaving] = useState(false);
    const [notifications, setNotifications] = useState({
        email: user?.notificationPreferences?.email ?? true,
        push: user?.notificationPreferences?.push ?? true,
        sms: user?.notificationPreferences?.sms ?? false,
    });
    const [savingNotification, setSavingNotification] = useState("");

    const updateField = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const name = form.name.trim();
        const phoneNumber = form.phone.replace(/[\s-]/g, "");
        if (name.length < 3) {
            toast.error("Name must be at least 3 characters.");
            return;
        }
        if (phoneNumber && !/^\d{6,15}$/.test(phoneNumber)) {
            toast.error("Enter a valid phone number.");
            return;
        }

        setIsSaving(true);
        try {
            const response = await updateProfile({
                name,
                phone: { countryCode: form.countryCode, number: phoneNumber },
            });
            onUserUpdated(response.user);
            toast.success("Profile updated.");
        } catch (error) {
            toast.error(getErrorMessage(error, "Could not update profile."));
        } finally {
            setIsSaving(false);
        }
    };

    // Toggles save right away; flip back if the request fails.
    const handleNotificationChange = async (id, checked) => {
        setNotifications((current) => ({ ...current, [id]: checked }));
        setSavingNotification(id);
        try {
            const response = await updateProfile({
                notificationPreferences: { [id]: checked },
            });
            onUserUpdated(response.user);
        } catch (error) {
            setNotifications((current) => ({ ...current, [id]: !checked }));
            toast.error(getErrorMessage(error, "Could not save preference."));
        } finally {
            setSavingNotification("");
        }
    };

    return (
        <div className="space-y-8">
            <section className={cardClassName}>
                <h1 className="text-3xl font-bold text-black">
                    Profile Settings
                </h1>
                <p className="mt-1 text-base text-[#475569]">
                    Update your account information
                </p>

                <div className="mt-6">
                    <ProfilePhoto
                        user={user}
                        onUploaded={(profilePicture) =>
                            onUserUpdated({ profilePicture })
                        }
                    />
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div>
                        <label
                            htmlFor="settings-name"
                            className="mb-3 block text-base font-medium text-black"
                        >
                            Full Name
                        </label>
                        <input
                            id="settings-name"
                            name="name"
                            value={form.name}
                            onChange={updateField}
                            autoComplete="name"
                            maxLength={80}
                            className={inputClassName}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="settings-email"
                            className="mb-3 block text-base font-medium text-black"
                        >
                            Email Address
                        </label>
                        <input
                            id="settings-email"
                            type="email"
                            value={user?.email ?? ""}
                            readOnly
                            title="Email address can't be changed here"
                            className={`${inputClassName} cursor-not-allowed bg-[#F8FAFC] text-[#475569]`}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="settings-phone"
                            className="mb-3 block text-base font-medium text-black"
                        >
                            Phone Number
                        </label>
                        <div className="flex gap-4">
                            <div className="relative w-28 shrink-0">
                                <select
                                    name="countryCode"
                                    value={form.countryCode}
                                    onChange={updateField}
                                    aria-label="Country code"
                                    className={`${inputClassName} appearance-none pr-10`}
                                >
                                    <option value="+91">+91</option>
                                    <option value="+1">+1</option>
                                    <option value="+44">+44</option>
                                    <option value="+971">+971</option>
                                </select>
                                <LuChevronDown
                                    aria-hidden="true"
                                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B]"
                                />
                            </div>
                            <input
                                id="settings-phone"
                                name="phone"
                                type="tel"
                                inputMode="numeric"
                                value={form.phone}
                                onChange={updateField}
                                placeholder="98765 43210"
                                autoComplete="tel-national"
                                maxLength={15}
                                className={inputClassName}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="h-14 w-full rounded-xl bg-[#2B1B14] text-base font-medium text-white transition hover:bg-[#3D2A21] disabled:cursor-wait disabled:opacity-60 cursor-pointer"
                    >
                        {isSaving ? "Saving…" : "Save Changes"}
                    </button>
                </form>
            </section>

            <section className={cardClassName}>
                <h2 className="text-3xl font-bold text-[#2B1B14]">
                    Notification Preferences
                </h2>
                <p className="mt-1 text-base text-[#94A3B8]">
                    Choose what you want to receive
                </p>
                <ul className="mt-6 space-y-6">
                    {NOTIFICATION_OPTIONS.map(({ id, label, icon: Icon }) => (
                        <li
                            key={id}
                            className="flex items-center justify-between gap-4"
                        >
                            <span className="flex items-center gap-4 text-base font-medium text-black">
                                <Icon
                                    aria-hidden="true"
                                    className="text-xl text-[#334155]"
                                />
                                {label}
                            </span>
                            <Toggle
                                label={label}
                                checked={notifications[id]}
                                disabled={savingNotification === id}
                                onChange={(checked) =>
                                    handleNotificationChange(id, checked)
                                }
                            />
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
};

// Must match DELETE_CONFIRMATION_TEXT in the backend deleteAccountController.
const DELETE_CONFIRMATION_TEXT = "DELETE";

const DELETE_CONSEQUENCES = [
    "Your profile will be deleted",
    "You will lose access to all features",
    "This action cannot be undone",
];

const DeleteAccountDialog = ({ usesPassword, onClose, onDeleted }) => {
    const dialogRef = useRef(null);
    const inputRef = useRef(null);
    const [value, setValue] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState("");

    const canSubmit = usesPassword
        ? value.length > 0
        : value.trim() === DELETE_CONFIRMATION_TEXT;

    // Lock page scroll, focus the input, close on Escape, keep Tab inside.
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        inputRef.current?.focus();

        const handleKeyDown = (event) => {
            if (event.key === "Escape" && !isDeleting) {
                event.preventDefault();
                onClose();
                return;
            }
            if (event.key !== "Tab") return;

            const focusable =
                dialogRef.current?.querySelectorAll(
                    "button:not(:disabled), input:not(:disabled)"
                ) ?? [];
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isDeleting, onClose]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!canSubmit || isDeleting) return;

        setIsDeleting(true);
        setError("");
        try {
            await deleteAccount(
                usesPassword
                    ? { password: value }
                    : { confirmation: value.trim() }
            );
            onDeleted();
        } catch (requestError) {
            setError(
                getErrorMessage(requestError, "Could not delete your account.")
            );
            setIsDeleting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !isDeleting) {
                    onClose();
                }
            }}
        >
            <div
                ref={dialogRef}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-account-title"
                aria-describedby="delete-account-description"
                className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] sm:p-8"
            >
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isDeleting}
                    aria-label="Close"
                    className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-xl text-[#64748B] transition hover:bg-[#F8FAFC] disabled:opacity-40 cursor-pointer"
                >
                    <LuX aria-hidden="true" />
                </button>

                <div className="flex flex-col items-center text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FDECEC] text-3xl text-[#DC2626]">
                        <LuTrash2 aria-hidden="true" />
                    </span>
                    <h2
                        id="delete-account-title"
                        className="mt-4 text-2xl font-bold text-[#DC2626]"
                    >
                        Delete Admin Account
                    </h2>
                    <p
                        id="delete-account-description"
                        className="mt-2 max-w-md text-sm leading-6 text-[#334155]"
                    >
                        This action is irreversible. All your data and access
                        will be permanently removed.
                    </p>
                </div>

                <ul className="mt-6 space-y-3 rounded-xl border border-[#FAD4D4] bg-[#FFF5F5] p-4 sm:p-5">
                    {DELETE_CONSEQUENCES.map((item) => (
                        <li
                            key={item}
                            className="flex items-center gap-3 text-sm text-[#111827]"
                        >
                            <LuCheck
                                aria-hidden="true"
                                className="shrink-0 text-base text-[#DC2626]"
                            />
                            {item}
                        </li>
                    ))}
                </ul>

                <form onSubmit={handleSubmit} className="mt-6">
                    <label
                        htmlFor="delete-account-confirmation"
                        className="block text-sm font-semibold text-[#111827]"
                    >
                        {usesPassword
                            ? "Enter your password to confirm"
                            : `Type ${DELETE_CONFIRMATION_TEXT} to confirm`}
                    </label>
                    <div className="relative mt-2">
                        <input
                            ref={inputRef}
                            id="delete-account-confirmation"
                            type={
                                usesPassword && !showPassword
                                    ? "password"
                                    : "text"
                            }
                            value={value}
                            onChange={(event) => {
                                setValue(event.target.value);
                                setError("");
                            }}
                            placeholder={
                                usesPassword
                                    ? "Enter password"
                                    : DELETE_CONFIRMATION_TEXT
                            }
                            autoComplete={
                                usesPassword ? "current-password" : "off"
                            }
                            disabled={isDeleting}
                            aria-invalid={Boolean(error)}
                            aria-describedby={
                                error ? "delete-account-error" : undefined
                            }
                            className={`h-12 w-full rounded-lg border bg-white px-4 text-sm text-[#111827] outline-none transition placeholder:text-[#94A3B8] focus:ring-2 disabled:opacity-60 ${
                                usesPassword ? "pr-12" : ""
                            } ${
                                error
                                    ? "border-[#DC2626] focus:ring-[#DC2626]/15"
                                    : "border-[#E2E8F0] focus:border-[#DC2626] focus:ring-[#DC2626]/15"
                            }`}
                        />
                        {usesPassword && (
                            <button
                                type="button"
                                onClick={() =>
                                    setShowPassword((current) => !current)
                                }
                                aria-label={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-lg text-[#64748B] hover:text-[#111827] cursor-pointer"
                            >
                                {showPassword ? (
                                    <LuEye aria-hidden="true" />
                                ) : (
                                    <LuEyeOff aria-hidden="true" />
                                )}
                            </button>
                        )}
                    </div>
                    {error && (
                        <p
                            id="delete-account-error"
                            role="alert"
                            className="mt-2 text-sm text-[#DC2626]"
                        >
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={!canSubmit || isDeleting}
                        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#DC2626] text-sm font-semibold text-white transition hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    >
                        {isDeleting && (
                            <LuLoaderCircle
                                className="animate-spin"
                                aria-hidden="true"
                            />
                        )}
                        {isDeleting ? "Deleting…" : "Delete My Account"}
                    </button>
                </form>
            </div>
        </div>
    );
};

const SecuritySettings = ({ user }) => {
    const navigate = useNavigate();
    const { clearSession } = useAuth();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const closeDialog = useCallback(() => setIsDialogOpen(false), []);

    // Google accounts have no password; they confirm by typing DELETE.
    const usesPassword = user?.authProvider !== "google";

    const handleDeleted = () => {
        toast.success("Your account has been permanently deleted.");
        // Navigate in the same update as clearing the user, so the admin
        // route guard never sees a signed-out user and redirects to /login.
        navigate(ROUTES.HOME, { replace: true });
        clearSession();
    };

    return (
        <section className={cardClassName}>
            <h1 className="text-3xl font-bold text-black">Security</h1>
            <p className="mt-1 text-base text-[#94A3B8]">
                Manage access to your admin account
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#FAD4D4] bg-[#FFF5F5] p-5">
                <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-[#DC2626]">
                        Delete account
                    </h2>
                    <p className="mt-1 text-sm text-[#475569]">
                        Permanently remove your profile and all access. This
                        cannot be undone.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setIsDialogOpen(true)}
                    className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-black px-5 text-sm font-semibold text-white transition hover:bg-[#292929] cursor-pointer"
                >
                    <LuTrash2 aria-hidden="true" />
                    Delete account
                </button>
            </div>

            {isDialogOpen && (
                <DeleteAccountDialog
                    usesPassword={usesPassword}
                    onClose={closeDialog}
                    onDeleted={handleDeleted}
                />
            )}
        </section>
    );
};

const ComingSoon = ({ title }) => (
    <section className={cardClassName}>
        <h1 className="text-3xl font-bold text-black">{title}</h1>
        <p className="mt-1 text-base text-[#94A3B8]">
            This section is coming soon.
        </p>
    </section>
);

const Settings = () => {
    const { user, updateUser } = useAuth();
    const [activeTab, setActiveTab] = useState("profile");

    return (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(220px,0.35fr)_minmax(0,1fr)]">
            <nav
                aria-label="Settings sections"
                className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.12)] lg:sticky lg:top-6"
            >
                <ul className="space-y-2">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <li key={id}>
                            <button
                                type="button"
                                onClick={() => setActiveTab(id)}
                                aria-current={activeTab === id ? "page" : undefined}
                                className={`flex w-full items-center gap-4 rounded-xl px-5 py-4 text-left text-base transition cursor-pointer ${
                                    activeTab === id
                                        ? "bg-[#F8EBDF] font-medium text-black"
                                        : "text-[#475569] hover:bg-[#F8FAFC]"
                                }`}
                            >
                                <Icon aria-hidden="true" className="text-xl" />
                                {label}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {activeTab === "profile" && (
                <ProfileSettings
                    // Remount when the user loads so the form picks up their name.
                    key={user?.email ?? "loading"}
                    user={user}
                    onUserUpdated={updateUser}
                />
            )}
            {activeTab === "business" && <ComingSoon title="Business Info" />}
            {activeTab === "security" && <SecuritySettings user={user} />}
        </div>
    );
};

export { Settings };

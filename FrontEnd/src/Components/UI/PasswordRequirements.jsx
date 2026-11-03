import { PASSWORD_RULES } from "../../constants/passwordRules.js";

const PasswordRequirements = ({ id, password }) => {
    const value = String(password || "");

    return (
        <ul id={id} className="mt-2 space-y-1 text-xs">
            {PASSWORD_RULES.map((rule) => {
                const met = rule.test(value);

                return (
                    <li
                        key={rule.id}
                        className={`flex items-center gap-2 ${
                            met ? "text-green-700" : "text-[#9DA3AA]"
                        }`}
                    >
                        <span aria-hidden="true" className="w-3 text-center">
                            {met ? "✓" : "•"}
                        </span>
                        <span>{rule.label}</span>
                        <span className="sr-only">
                            {met ? "(met)" : "(not met)"}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
};

const PasswordMatchHint = ({ password, confirmPassword }) => {
    if (!confirmPassword) return null;

    const matches = password === confirmPassword;

    return (
        <p
            className={`mt-1.5 text-xs ${
                matches ? "text-green-700" : "text-red-600"
            }`}
            aria-live="polite"
        >
            {matches ? "✓ Passwords match" : "Passwords do not match"}
        </p>
    );
};

export { PasswordRequirements, PasswordMatchHint };

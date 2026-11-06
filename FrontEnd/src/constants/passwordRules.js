// Mirrors the backend password regex in BackEnd/api/v1/Auth/dto.js:
// /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,64}$/
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 64;

const PASSWORD_RULES = [
    {
        id: "length",
        label: `${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters`,
        test: (value) =>
            value.length >= PASSWORD_MIN_LENGTH &&
            value.length <= PASSWORD_MAX_LENGTH,
    },
    {
        id: "lowercase",
        label: "One lowercase letter (a-z)",
        test: (value) => /[a-z]/.test(value),
    },
    {
        id: "uppercase",
        label: "One uppercase letter (A-Z)",
        test: (value) => /[A-Z]/.test(value),
    },
    {
        id: "number",
        label: "One number (0-9)",
        test: (value) => /\d/.test(value),
    },
    {
        id: "special",
        label: "One special character (@ $ ! % * ? & #)",
        test: (value) => /[@$!%*?&#]/.test(value),
    },
    {
        id: "allowed",
        label: "No spaces or other symbols",
        test: (value) => value.length > 0 && /^[A-Za-z\d@$!%*?&#]+$/.test(value),
    },
];

const isPasswordValid = (value) =>
    PASSWORD_RULES.every((rule) => rule.test(String(value || "")));

export { PASSWORD_RULES, PASSWORD_MAX_LENGTH, isPasswordValid };

import { forwardRef } from "react";

const FormField = forwardRef(function FormField(
    {
        id,
        label,
        type,
        error,
        className = "",
        ...inputProps
    },
    ref
) {
    return (
        <div className="space-y-2">
            <label htmlFor={id} className="block text-sm font-medium text-neutral-200">
                {label}
            </label>
            <input
                {...inputProps}
                ref={ref}
                id={id}
                name={id}
                type={type}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                className={`w-full rounded-lg border bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition-colors placeholder:text-neutral-600 focus:border-amber-400 ${
                    error ? "border-red-500" : "border-neutral-700"
                } ${className}`}
            />
            {error && (
                <p id={`${id}-error`} className="text-sm text-red-400" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
});

export { FormField };

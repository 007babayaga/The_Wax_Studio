import { GoogleLogin } from "@react-oauth/google";
import { toast } from "react-toastify";
import { getErrorMessage } from "../../Services/Api";
import { googleLogin } from "../../Services/AuthService";

const GoogleAuthButton = ({ disabled = false, onSuccess, width = 320 }) => {
    const handleSuccess = async ({ credential }) => {
        if (!credential) {
            toast.error("Google did not return an ID token. Please try again.");
            return;
        }

        try {
            const response = await googleLogin(credential);
            onSuccess?.(response?.user);
        } catch (error) {
            toast.error(getErrorMessage(error, "Could not sign in with Google. Please try again."));
        }
    };

    return (
        <div
            aria-disabled={disabled}
            className={`flex justify-center ${disabled ? "pointer-events-none opacity-60" : ""}`}
        >
            <GoogleLogin
                onSuccess={handleSuccess}
                onError={() => toast.error("Google sign-in failed. Please try again.")}
                text="signup_with"
                shape="square"
                theme="outline"
                width={width}
                logo_alignment="center"
            />
        </div>
    );
};

export { GoogleAuthButton };

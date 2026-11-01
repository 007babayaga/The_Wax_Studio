import { ApiError, api } from "./Api.js";

const loginUser = ({ email, password }) =>
    api.post("/auth/userLogin", { email, password }, { skipRefresh: true });

//  sign up
const sendEmailOtp = ({ email,name,dateOfBirth }) =>
    api.post("/otp/toEmail", { email,dateOfBirth,name }, { skipRefresh: true });

//  sign up
const verifyEmailOtp = ({ email, otp }) =>
    api.post("/otp/verifyEmailOtp", { email, otp }, { skipRefresh: true });

// sign up
const signUpUser = ({ name, email, dateOfBirth ,password}) =>
    api.post("/auth/signUp", { name, email, dateOfBirth ,password}, { skipRefresh: true });

const googleLogin = (idToken) =>
    api.post("/auth/google", { idToken }, { skipRefresh: true });

// restore session on page refresh (returns the user, or null if not logged in)
const getCurrentUser = async ({ signal } = {}) => {
    try {
        const data = await api.get("/auth/userStatus", {}, { signal });
        return data?.user ?? null;
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
    }
};

const logoutUser = () =>
    api.post("/auth/userLogout", undefined, { skipRefresh: true });

export { loginUser, sendEmailOtp, verifyEmailOtp, signUpUser, googleLogin, getCurrentUser, logoutUser };
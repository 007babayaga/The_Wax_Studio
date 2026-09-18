const { validateDateOfBirth } = require("../../../utils/userDOBvalidator");

const validateUserSignUp = async (req, res, next) => {
    try {
        console.log("--------------Inside validateUserSignUp----------------");

        const { name, dateOfBirth, email, password } = req.body;
        const normalizedEmail = String(email || "").trim().toLowerCase();

        if (!name || String(name).trim().length < 3) {
            return res.status(400).json({
                isSuccess: false,
                message: "Enter a valid Name"
            });
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                isSuccess: false,
                message: "Enter valid email address"
            });
        }

        const dobValidation = validateDateOfBirth(dateOfBirth);
        if (!dobValidation.isValid) {
            return res.status(400).json({
                isSuccess: false,
                message: dobValidation.message
            });
        }

        if (password) {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,12}$/;
            if (!passwordRegex.test(String(password))) {
                return res.status(400).json({
                    isSuccess: false,
                    message: "Enter a valid Password"
                });
            }
        }

        req.body.email = normalizedEmail;
        return next();
    } catch (err) {
        console.log("-----------Error in validateUserSignUp------", err.message);
        return res.status(500).json({
            isSuccess: false,
            message: "Internal Server error "
        });
    }
};

const validateUserLogin = async (req, res, next) => {
    try {
        console.log("--------------Inside validateUserLogin----------------");

        const { email, password } = req.body;
        const normalizedEmail = String(email || "").trim().toLowerCase();

        if (!normalizedEmail || !password) {
            return res.status(400).json({
                isSuccess: false,
                message: "Email and Password should not be Empty"
            });
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                isSuccess: false,
                message: "Enter valid email address"
            });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,12}$/;
        if (!passwordRegex.test(String(password))) {
            return res.status(400).json({
                isSuccess: false,
                message: "Enter a valid Password"
            });
        }

        req.body.email = normalizedEmail;
        return next();
    } catch (err) {
        console.log("-----------Error in validateUserLogin------", err.message);
        return res.status(500).json({
            isSuccess: false,
            message: "Internal Server error "
        });
    }
};

module.exports = { validateUserSignUp, validateUserLogin };
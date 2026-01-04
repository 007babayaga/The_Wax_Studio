const validatePhoneNumberforOtp = async(req,res,next) => {
    try {
        console.log("------------Inside validatePhoneNumberforOtp-------------")
        const { phoneNo } = req.body

        //Check for Phone Number should surely coming in Body
        if (!phoneNo) {
            res.status(400).json({
                isSuccess: false,
                message: "Phone Number is required"
            })
            return
        }

        //Check if it is String
        if (typeof phoneNo !== "string") {
            res.status(400).json({
                success: false,
                message: "Phone number must be a string",
            });
            return
        }
        
        //Check for Only Indian Numbers
        const indianPhoneRegex = /^[6-9]\d{9}$/;
        if(!indianPhoneRegex.test(phoneNo)){
            res.status(400).json({
                isSuccess:false,
                message:"Enter Valid Phone Number"
            })
            return
        }

        next();
    }
    catch (err) {
        console.log("------------Error in validatePhoneNumberforOtp---------", err.message)
        res.status(400).json({
            isSuccess: false,
            message: "Error in validatePhoneNumberforOtp"
        })
    }
}

const validateEmailforOtp = async(req,res,next) => {
    try {
        console.log("------------Inside validateEmailforOtp-------------")
        const { email } = req.body

        //Check for Phone Number should surely coming in Body
        if (!email) {
            res.status(400).json({
                isSuccess: false,
                message: "Email is required"
            })
            return
        }

        //Check if it is String
        if (typeof email !== "string") {
            res.status(400).json({
                success: false,
                message: "Phone number must be a string",
            });
            return
        }
        
         // Check for valid email format
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if(!emailRegex.test(email)){
            res.status(400).json({
                isSuccess: false,
                message: "Enter valid email address"
            })
            return
        }

        next();
    }
    catch (err) {
        console.log("------------Error in validateEmailforOtp---------", err.message)
        res.status(400).json({
            isSuccess: false,
            message: "Error in validateEmailforOtp"
        })
    }
}
const validateOtpVerification = async(req,res,next) => {
    try {
        console.log("------------Inside validateOtpVerification-------------")
        const { email,otp } = req.body

        //Check for Phone Number should surely coming in Body
        if (!email) {
            res.status(400).json({
                isSuccess: false,
                message: "Email is required"
            })
            return
        }

        //Check if it is String
        if (!otp || otp.length <4) {
            res.status(400).json({
                success: false,
                message: "Enter Valid Otp",
            });
            return
        }

        next();
    }
    catch (err) {
        console.log("------------Error in validateOtpVerification---------", err.message)
        res.status(400).json({
            isSuccess: false,
            message: "Error in validateOtpVerification"
        })
    }
}


module.exports = { validatePhoneNumberforOtp,validateEmailforOtp,validateOtpVerification }
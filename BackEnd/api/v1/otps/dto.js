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

module.exports = { validatePhoneNumberforOtp }
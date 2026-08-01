const { userModel } = require("../../../models/userSchema")

const validateUserEmail = async(req,res,next)=>{
    try{
        console.log("-------------------Inside validateUserEmail----------- ")
        const { email } = req.body

        if (!email || typeof email !== "string" || email.trim() === "") {
            res.status(400).json({
                isSuccess: false,
                message: "Email is required"
            })
            return
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        if (!emailRegex.test(email.trim())) {
            res.status(400).json({
                isSuccess: false,
                message: "Email format is invalid"
            })
            return
        }

        const existingUser = await userModel.findOne({ email: email.trim().toLowerCase() })
        if (existingUser) {
            res.status(409).json({
                isSuccess: false,
                message: "Email is already registered"
            })
            return
        }

        next();
    }
    catch(err){
        console.log("Error in validateUserEmail", err.message)
        return res.status(500).json({
            isSuccess: false,
            message: "Internal Server Error"
        })
    }
}

module.exports = { validateUserEmail }
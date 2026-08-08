const { validateDateOfBirth } = require("../../../utils/userDOBvalidator");

const validateUserSignUp = async(req,res,next)=>{
    try{
        console.log("--------------Inside validateUserSignUp----------------")
        const{name,dateOfBirth,email,password} = req.body;

        //validate name
        if(!name|| name.length<3){
            res.status(400).json({
                isSuccess:false,
                message:"Enter a valid Name"
            })
            return
        }

        // validate email
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if(!emailRegex.test(email)){
            res.status(400).json({
                isSuccess: false,
                message: "Enter valid email address"
            })
            return
        }

         // Validate DOB
        const dobValidation = validateDateOfBirth(dateOfBirth);
        if(!dobValidation.isValid){
            res.status(400).json({
                isSuccess:false,
                message:dobValidation.message
            })
            return
        }

        //validate password only if it is provided during the initial signup step
        if(password){
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,12}$/;
            if(!passwordRegex.test(password)){
                res.status(400).json({
                    isSuccess:false,
                    message:"Enter a valid Password"
                })
                return
            }
        }
        
        next();

    }
    catch(err){
        console.log("-----------Error in validateUserSignUp------",err.message)
        res.status(500).json({
            isSuccess:false,
            message:"Internal Server error "
        })
    }
}

const validateUserLogin = async(req,res,next)=>{
    try{
        console.log("--------------Inside validateUserLogin----------------")
        const{email,password} = req.body;
        if(!email || !password){
            res.status(400).json({
                isSuccess:false,
                message:"Email and Password should not be Empty"
            })
            return
        }
        // validate email
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if(!emailRegex.test(email)){
            res.status(400).json({
                isSuccess: false,
                message: "Enter valid email address"
            })
            return
        }

        //validate password only if it is provided during the initial signup step
        if(password){
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,12}$/;
            if(!passwordRegex.test(password)){
                res.status(400).json({
                    isSuccess:false,
                    message:"Enter a valid Password"
                })
                return
            }
        }
        next();

    }
    catch(err){
        console.log("-----------Error in validateUserLogin------",err.message)
        res.status(500).json({
            isSuccess:false,
            message:"Internal Server error "
        })
    }
}


module.exports={validateUserSignUp,validateUserLogin}
const { userModel } = require("../../../models/userSchema");

const userSignUpController = async(req,res)=>{
    try{
        console.log("--------------Inside userSignUpController----------------")
        const{name,dateOfBirth,email,password} = req.body;
        await userModel.create({
            name,
            email,
            dateOfBirth,
            password
        })
        res.status(201).json({
            isSuccess:true,
            messsage:"SignUp Success!"
        })

    }
    catch(err){
        console.log("-----------Error in userSignUpController------",err.message)
        res.status(500).json({
            isSuccess:false,
            message:"Internal Server error "
        })
    }
}

module.exports={userSignUpController}
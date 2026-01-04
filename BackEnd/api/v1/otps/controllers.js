const bcrypt = require('bcrypt');
const { emailOtpModel } = require("../../../models/emailOtpSchema");
const { phoneOtpModel } = require("../../../models/phoneOtpSchema");
const axios = require('axios');
const { sendOtp } = require("../../../utils/emailHelper");
const { userModel } = require('../../../models/userSchema');

const sendOtpController =  async(req,res)=>{
    try{
        console.log("---------------Inside sendOtpController--------------")
        const{phoneNo}= req.body;

        // Rate limiting - Check for recent OTP request
        // Check for existing OTP
        const existingOtp = await phoneOtpModel.findOne({ phoneNo });
        
        if (existingOtp) {
            // Check if createdAt exists
            if (existingOtp.createdAt) {
                const timeSinceLastOtp = Date.now() - existingOtp.createdAt.getTime();
                const oneMinute = 60 * 1000; // 1 minute

                if (timeSinceLastOtp < oneMinute) {
                    const waitTime = Math.ceil((oneMinute - timeSinceLastOtp) / 1000);
                    
                    res.status(429).json({
                        isSuccess: false,
                        message: `Please wait ${waitTime} seconds before requesting another OTP`
                    });
                    return
                }
            }
            
            // Delete old OTP
            console.log("Deleting old OTP...");
            await phoneOtpModel.findOneAndDelete({ phoneNo });
        }
        
        //generate the otp
        const otp = Math.floor(Math.random()*9000 +1000);

        //send it on the Phone number using a service
        // Send OTP via any service for just development purpose
        try {
            const message = `Your OTP is ${otp}. Valid for 5 minutes. Do not share.`;
            const apiUrl = `https://2factor.in/API/V1/${process.env.TWO_FACTOR_API_KEY}/SMS/${phoneNo}/${otp}`;
            const response = await axios.get(apiUrl);

            // Check if SMS was sent successfully
            if (response.data.return === false) {
                throw new Error(response.data.message || 'SMS sending failed');
            }

            console.log(`✅ OTP sent to ${phoneNo}: ${otp}`);

        } catch (smsError) {
            console.error("---SMS Error❌-----", smsError.response?.data || smsError.message);
            return res.status(500).json({
                isSuccess: false,
                message: "Failed to send OTP. Please check your phone number and try again."
            });
        }

        //Generate a expiry Time(5 minutes from now)
        const otpExpiryTime = new Date(Date.now() + 5 * 60 * 1000); 

        //before storing otp I will check for Duplicate Document
        const otpdoc = await phoneOtpModel.findOne({phoneNo});
        if(otpdoc){
            await phoneOtpModel.findOneAndDelete({phoneNo})
        }
        
        //now store the otp,phoneNumber,expirytime for Otp verification
        await phoneOtpModel.create({
            phoneNo,
            otp,
            otpExpiryTime,
            attempts: 0
        })

        res.status(200).json({
            isSuccess:true,
            message:"Otp sent Successfully"
        })
    }
    catch(err){
        console.log("----------Error in sendOtpController",err.message);
        res.status(500).json({
            isSuccess:false,
            message:"server Error while Sending Otp!"
        })
    }
}

const sendOtpToEmailController = async(req,res)=>{
    try{
        console.log("-----------------Inside sendOtpToEmailController------------")
        const{email}= req.body;

        //check here to see if user Exists already
        const isAlreadyaUser = await userModel.findOne({email});
        if(isAlreadyaUser){
            res.status(400).json({
                isSuccess:false,
                message:"User Already Exists!"
            })
            return
        }
        
        //Rate limiting for recent otp request
        const existingOtp = await emailOtpModel.findOne({email})

        if (existingOtp) {
            // Check if createdAt exists
            if (existingOtp.createdAt) {
                const timeSinceLastOtp = Date.now() - existingOtp.createdAt.getTime();
                const oneMinute = 60 * 1000; // 1 minute

                if (timeSinceLastOtp < oneMinute) {
                    const waitTime = Math.ceil((oneMinute - timeSinceLastOtp) / 1000);
                    
                    res.status(429).json({
                        isSuccess: false,
                        message: `Please wait ${waitTime} seconds before requesting another OTP`
                    });
                    return
                }
            }
            // Delete old OTP
            console.log("Deleting old OTP...");
            await emailOtpModel.findOneAndDelete({ email });
        }
        //generate the otp
        const otp = Math.floor(Math.random()*9000 +1000);

        //We send the Otp to email using EmailHelper file(NodeMailer)
        await sendOtp(email,otp);

         //Generate a expiry Time(5 minutes from now)
        const otpExpiryTime = new Date(Date.now() + 5 * 60 * 1000); 

        //before storing otp I will check for Duplicate Document
        const otpdoc = await emailOtpModel.findOne({email});
        if(otpdoc){
            await emailOtpModel.findOneAndDelete({email})
        }

        //now store the otp,email,expirytime for Otp verification
        await emailOtpModel.create({
            email,
            otp,
            otpExpiryTime,
            attempts: 0
        })

        res.status(201).json({
            isSuccess:true,
            message:"Otp sent Successfully"
        })
        
    }
    catch(err){
        console.log("-------Error in sendOtpToEmailController----",err.message)
        res.status(500).json({
            isSuccess:false,
            message:"Internal Server Error"
        })
    }
}
const otpVerificationController = async(req,res)=>{
    try{
        console.log("-----------------Inside otpVerificationController------------")
        const{email,otp}= req.body;

        // get the Otp doc from Otp model using email
        const otpdoc = await emailOtpModel.findOne({email});
        if (otpdoc === null) {
            res.status(400).json({
                isSuccess: false,
                message: "Otp not Found! Please send the Otp to this email First"
            })
            return
        }
        // check for otp Expiry
        if (otpdoc.otpExpiryTime < Date.now()) {
            res.status(400).json({
                isSuccess: false,
                message: "OTP Expired! Please request a new OTP."
            });
            return;
        }

        // comapred the hashed otp and user Entered otp using bcrypt
        const {otp:hashedOtp}= otpdoc;

        const isCorrect = await bcrypt.compare(otp.toString(),hashedOtp);
        if(!isCorrect){
            res.status(400).json({
                isSuccess:false,
                message:"Incorrect OTP!"
            })
            return
        }
        // delete the otp after successfull verification
        await emailOtpModel.findOneAndDelete({email})

        //send Success response
        res.status(200).json({
            isSuccess:true,
            message:"OTP verification successs!"
        })
    }
    catch(err){
        console.log("-------Error in otpVerificationController----",err.message)
        res.status(500).json({
            isSuccess:false,
            message:"Internal Server Error"
        })
    }
}

module.exports={sendOtpController,sendOtpToEmailController,otpVerificationController}
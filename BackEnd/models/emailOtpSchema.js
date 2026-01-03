const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const{Schema,model}= mongoose;

const emailOtpSchema = new Schema({
    email:{
        type:String,
        trim:true,
        required:true,
    },
    otp:{
        type:String,
        trim:true,
        required:true,
    },
    otpExpiryTime:Date,
    attempts: {
        type: Number,
        default: 0
    }
},{
    versionKey:false,
    timestamps:true
})

emailOtpSchema.pre("save",async function(){
    if(this.isModified("otp")){
        this.otp = await bcrypt.hash(this.otp.toString(),11)
    }
})

const emailOtpModel = model('emailOtp',emailOtpSchema)

module.exports={emailOtpModel}
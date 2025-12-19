const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const{Schema,model}= mongoose;

const phoneOtpSchema = new Schema({
    phoneNo:{
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

phoneOtpSchema.pre("save",async function(){
    if(this.isModified("otp")){
        this.otp = await bcrypt.hash(this.otp.toString(),11)
    }
})

const phoneOtpModel = model('phoneOtp',phoneOtpSchema)

module.exports={phoneOtpModel}
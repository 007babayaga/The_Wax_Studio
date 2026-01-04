const mongoose = require('mongoose');
const bcrypt = require('bcrypt')

const{Schema,model}=mongoose;

const userSchema = new Schema({
    name:{
        type:String,
        min:3,
        trim:true,
        required:true
    },
    dateOfBirth:{
        type:String,
        trim:true,
        required:true
    },
    email:{
        type:String,
        trim:true,
        required:true
    },
    password:{
        type:String,
        required:true,
        trim:true
    }
},{
    timestamps:true,
    versionKey:false
})

userSchema.pre("save",async function(){
    if(this.isModified("password")){
        this.password = await bcrypt.hash(this.password.toString(),11)
    }
})

const userModel = model("user",userSchema);

module.exports={userModel};
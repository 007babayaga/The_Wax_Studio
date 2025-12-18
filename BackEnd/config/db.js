const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_DB_URL,{
    dbName:"TheWaxStudio"
}).then(()=>{
    console.log("-----------------Database Connected✅-------------------")
}).catch((err)=>{
    console.log("-----------------Error in Database Connection❌---------",err.message)
})
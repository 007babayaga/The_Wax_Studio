const cookieParser = require('cookie-parser');
const express = require('express');
const morgan = require('morgan');

const app = express();

require('dotenv').config()

app.use(express.json()); // Incoming request Body Parsing Middleware

app.use(cookieParser());  // Incoming request Cookie Parsing Middleware

app.use(morgan('dev'));    // Incoming request Logger Middleware


// Ek Health check Api  Endpoint
app.get("/",(req,res)=>{
    res.status(200).json({
        isSuccess:true,
        message:"Server is Running Fine"
    })
})

app.listen(process.env.PORT_NUMBER,()=>{
    console.log("------------------Server Started✅--------------")
})
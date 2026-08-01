require('dotenv').config()
const cookieParser = require('cookie-parser');
const express = require('express');
const morgan = require('morgan');
const cors = require("cors");

const { apiRouter } = require('./api/routes');

const app = express();


require("./config/db")

app.use(express.json()); // Incoming request Body Parsing Middleware

app.use(cookieParser());  // Incoming request Cookie Parsing Middleware

app.use(morgan('dev'));    // Incoming request Logger Middleware




app.use(cors({
    origin:"http://localhost:5173",
    credentials:true
}))

app.use(express.json()) // parse the data coming in req body

// Routing according to  MVC arctietcture
app.use('/api/v1',apiRouter)

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
const mongoose = require('mongoose');

// Resolves once connected; app.js waits for this before accepting requests.
const connectDB = async () => {
    await mongoose.connect(process.env.MONGO_DB_URL, {
        dbName: "TheWaxStudio"
    });
    console.log("-----------------Database Connected✅-------------------");
};

module.exports = { connectDB };

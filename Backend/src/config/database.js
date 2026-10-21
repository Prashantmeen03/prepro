const mongoose = require("mongoose")



async function connectToDB() {

    try {
        if (!process.env.MONGO_URI) {
            console.error("\x1b[31m[Database Error]\x1b[0m MONGO_URI is not defined in .env! Please configure MONGO_URI in Backend/.env");
            return;
        }

        await mongoose.connect(process.env.MONGO_URI)

        console.log("Connected to Database")
    }
    catch (err) {
        console.error("Database connection failed:", err.message)
    }
}

module.exports = connectToDB
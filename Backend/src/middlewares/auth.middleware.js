const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.model")

async function authUser(req, res, next) {
    try {
        let token = req.cookies?.token

        // Support Bearer token in Authorization header as well
        if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1]
        }

        if (!token) {
            return res.status(401).json({
                message: "Authentication token not provided."
            })
        }

        const mongoose = require("mongoose")
        if (mongoose.connection.readyState === 1) {
            const isTokenBlacklisted = await tokenBlacklistModel.findOne({ token })
            if (isTokenBlacklisted) {
                return res.status(401).json({
                    message: "Token has been revoked. Please log in again."
                })
            }
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret")
        req.user = decoded
        next()
    } catch (err) {
        return res.status(401).json({
            message: "Invalid or expired token."
        })
    }
}

module.exports = { authUser }
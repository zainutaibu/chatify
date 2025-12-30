import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/user.routes.js";
import messageRouter from "./routes/message.route.js";
import { Server } from "socket.io";

// Create Express app and http server
const app = express();
const server = http.createServer(app)

// Socket.io configuration
export const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
})

// Store online users
export const userSoketMap = {};

// Socket.io connection handler
io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    
    if (!userId || userId === "undefined") {
        console.log("Invalid userId, disconnecting socket");
        socket.disconnect();
        return;
    }
    
    console.log("User Connected", userId);
    
    userSoketMap[userId] = socket.id;
    
    io.emit("getOnlineUsers", Object.keys(userSoketMap));

    socket.on("disconnect", () => {
        console.log("User Disconnected", userId);
        delete userSoketMap[userId];
        io.emit("getOnlineUsers", Object.keys(userSoketMap))
    })

    socket.on("error", (error) => {
        console.error("Socket error for user", userId, error);
    });
})

// Middleware setup 
app.use(express.json({limit: "4mb"}));
app.use(cors({
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

// Routes setup
app.use("/api/status", (req, res) => res.send("server is live"));
app.use("/api/auth", userRouter)
app.use("/api/messages", messageRouter)

// ⭐ Test route for delete
app.delete("/api/test-delete", (req, res) => {
    console.log("✅ DELETE route is working!");
    res.json({success: true, message: "DELETE method works"});
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: "Something went wrong!" });
});

// Connect to MongoDB
await connectDB()

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log("Database is connected");
    console.log("Server is running on port: " + PORT);
    console.log("✅ DELETE routes enabled");
});
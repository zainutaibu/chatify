import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { io, userSoketMap } from "../server.js";
import cloudinary from "../lib/cloudnary.js";

// Get all users for sidebar
export const getUserForSidebar = async (req, res) => {
    try {
        const userId = req.user._id;
        const filteredUsers = await User.find({ _id: { $ne: userId } }).select("-password");

        // Count unseen messages
        const unseenmessages = {}
        const promises = filteredUsers.map(async (user) => {
            const messageCount = await Message.countDocuments({ 
                senderId: user._id, 
                receiverId: userId, 
                seen: false 
            });
            if (messageCount > 0) {
                unseenmessages[user._id] = messageCount;
            }
        })
        await Promise.all(promises);
        
        res.json({ success: true, users: filteredUsers, unseenmessages })
    } catch (error) {
        console.log("Error in getUserForSidebar:", error.message);
        res.json({ success: false, message: error.message })
    }
}

// Get all messages for selected user 
export const getMessages = async (req, res) => {
    try {
        const { id: selectedUserId } = req.params;
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: selectedUserId },
                { senderId: selectedUserId, receiverId: myId }
            ]
        }).sort({ createdAt: 1 });

        // Mark messages as seen
        await Message.updateMany(
            { senderId: selectedUserId, receiverId: myId, seen: false }, 
            { seen: true }
        );
        
        res.json({ success: true, message: messages })
    } catch (error) {
        console.log("Error in getMessages:", error.message);
        res.json({ success: false, message: error.message })
    }
}

// Mark message as seen using message id
export const markMessageAsSeen = async (req, res) => {
    try {
        const { id } = req.params;
        await Message.findByIdAndUpdate(id, { seen: true })
        res.json({ success: true })
    } catch (error) {
        console.log("Error in markMessageAsSeen:", error.message);
        res.json({ success: false, message: error.message })
    }
}

// Send message to selected user
export const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const receiverId = req.params.id;
        const senderId = req.user._id;

        let imageUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image)
            imageUrl = uploadResponse.secure_url;
        }
        
        const newMessage = await Message.create({
            senderId,
            receiverId,
            text,
            image: imageUrl
        })

        // Emit the new message to receiver's socket
        const receiverSocketId = userSoketMap[receiverId];
        if (receiverSocketId) {
            console.log("✅ Emitting message to receiver:", receiverId);
            io.to(receiverSocketId).emit("newMessage", newMessage)
        } else {
            console.log("⚠️ Receiver not online:", receiverId);
        }

        res.json({ success: true, newMessage });
    } catch (error) {
        console.log("Error in sendMessage:", error.message);
        res.json({ success: false, message: error.message })
    }
}

// ⭐ NEW: Delete all messages between two users
export const deleteChat = async (req, res) => {
    try {
        const { id: otherUserId } = req.params;
        const myId = req.user._id;

        console.log("🗑️ Attempting to delete chat:");
        console.log("   My ID:", myId);
        console.log("   Other User ID:", otherUserId);

        // Delete all messages between the two users
        const result = await Message.deleteMany({
            $or: [
                { senderId: myId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: myId }
            ]
        });

        console.log(`✅ Successfully deleted ${result.deletedCount} messages`);
        
        res.json({ 
            success: true, 
            message: "Chat deleted successfully",
            deletedCount: result.deletedCount 
        });
    } catch (error) {
        console.error("❌ Error in deleteChat:", error);
        res.json({ success: false, message: error.message })
    }
}
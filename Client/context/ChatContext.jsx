import axios from "axios";
import { useContext, useEffect, useState, createContext } from "react";
import toast from "react-hot-toast";
import { AuthContext } from "./AuthContext";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [unseenMessages, setUnseenMessages] = useState({})
   
    const {socket, axios: authAxios} = useContext(AuthContext)

    // Get all users for sidebar
    const getUsers = async () => {
        try {
           const {data} = await authAxios.get(`${backendUrl}/api/messages/users`); 
           if (data.success) {
            setUsers(data.users)
            setUnseenMessages(data.unseenmessages || {})
           }
        } catch (error) {
          console.error("Error getting users:", error);
          toast.error(error.message)  
        }
    }
    
    // Get messages for selected user
    const getMessage = async (userId) => {
        try {
            const {data} = await authAxios.get(`${backendUrl}/api/messages/${userId}`);
            if (data.success) {
                setMessages(data.message || [])
            }
        } catch (error) {
            console.error("Error getting messages:", error);
            toast.error(error.message)
        }
    }

    // Send message to selected user
    const sendMessage = async (messageData) => {
        try {
            const {data} = await authAxios.post(`${backendUrl}/api/messages/send/${selectedUser._id}`, messageData);
            if (data.success) {
                setMessages((prevMessages) => [...(prevMessages || []), data.newMessage])
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Error sending message:", error);
            toast.error(error.message);
        }
    }

    // Delete chat with selected user
    const deleteChat = async (userId) => {
        try {
            console.log("🗑️ Frontend: Attempting to delete chat with userId:", userId);
            
            const response = await authAxios.delete(`${backendUrl}/api/messages/delete/${userId}`);
            console.log("📥 Frontend: Delete response:", response);
            
            if (response.data.success) {
                console.log("✅ Frontend: Chat deleted successfully");
                setMessages([]);
                setSelectedUser(null);
                toast.success("Chat deleted successfully");
                // Refresh users list
                await getUsers();
            } else {
                console.log("❌ Frontend: Delete failed:", response.data.message);
                toast.error(response.data.message || "Failed to delete chat");
            }
        } catch (error) {
            console.error("❌ Frontend: Delete error:", error);
            console.error("Error details:", error.response?.data);
            toast.error(error.response?.data?.message || error.message || "Failed to delete chat");
        }
    }

    // Subscribe to new messages via socket
    const subscribeToMessages = () => {
        if (!socket) return;
        
        socket.on("newMessage", (newMessage) => {
            if (selectedUser && newMessage.senderId === selectedUser._id) {
                newMessage.seen = true;
                setMessages((prevMessages) => [...(prevMessages || []), newMessage]);
                authAxios.put(`${backendUrl}/api/messages/mark/${newMessage._id}`);
            } else {
                setUnseenMessages((prevUnseenMessages) => ({
                    ...(prevUnseenMessages || {}),
                    [newMessage.senderId]: (prevUnseenMessages?.[newMessage.senderId] || 0) + 1
                }))
            }
        })
    }

    // Unsubscribe from messages
    const unsubscribeToMessages = () => {
        if (socket) socket.off("newMessage");
    }

    // Load messages when user is selected
    useEffect(() => {
        if (selectedUser) {
            getMessage(selectedUser._id);
            
            // Mark unseen messages as seen
            setUnseenMessages((prev) => ({
                ...(prev || {}),
                [selectedUser._id]: 0
            }));
        }
    }, [selectedUser]);

    useEffect(() => {
        subscribeToMessages();
        return () => unsubscribeToMessages();
    }, [socket, selectedUser])

    const value = {
        messages,
        users, 
        selectedUser, 
        getUsers, 
        getMessage,
        setMessages, 
        sendMessage, 
        setSelectedUser, 
        unseenMessages,
        setUnseenMessages,
        deleteChat
    }
    
    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    )
}
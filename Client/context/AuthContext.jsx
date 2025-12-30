import { createContext } from "react";
import axios from "axios"
import { useState } from "react";
import toast from "react-hot-toast";
import { useEffect } from "react";
import {io} from "socket.io-client";
import { useNavigate } from "react-router-dom";

const backendUrl = import.meta.env.VITE_BACKEND_URL;
axios.defaults.baseURL=backendUrl

export const AuthContext = createContext();

export const AuthProvider=({children})=>{
    const navigate = useNavigate();
    
    const [token,setToken]=useState(localStorage.getItem("token"));
    const [authUser,setAuthUser]= useState(null);
    const [onlineUsers,setOnlineUsers]= useState([]);
    const [socket,setSocket]= useState(null);

    // Check if user is authenticated
    const checkAuth = async ()=>{
        try {
            const {data}=await axios.get("/api/auth/check");
            if(data.success){
                setAuthUser(data.user)
            }
        } catch (error) {
            console.error("Auth check failed:", error);
        }
    }

    //Login function
    const login = async (state, Credentials)=>{
        try {
            const {data}= await axios.post(`/api/auth/${state}`,Credentials);
            if(data.success){
                setAuthUser(data.userData);
                axios.defaults.headers.common["token"]= data.token;
                setToken(data.token);
                localStorage.setItem("token",data.token)
                toast.success(data.message)
                navigate('/');
            }else{
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        }
    }

    //Logout function
    const logout = async ()=>{
        if(socket){
            socket.disconnect();
            setSocket(null);
        }
        localStorage.removeItem("token");
        setToken(null);
        setAuthUser(null);
        setOnlineUsers([]);
        axios.defaults.headers.common["token"]=null;
        toast.success("Logged out successfully")
        navigate('/login');
    }

    //update profile function
    const updateProfile= async (body)=>{
        try {
            const {data}=await axios.put("/api/auth/update-profile",body);
            setAuthUser(data.user);
            toast.success("Profile updated successfully")
            navigate('/');
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        }
    }
    
    //connect socket function - ⭐ FIXED
    const connectSocket = (userData)=>{
        // Agar already connected hai to return kar do
        if(!userData || socket?.connected) return;
        
        const newSocket = io(backendUrl,{
            query:{
                userId: userData._id,
            },
            transports: ['websocket', 'polling'], // ⭐ Both transports
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });
        
        setSocket(newSocket);

        // Online users listener
        newSocket.on("getOnlineUsers",(userIds)=>{
            setOnlineUsers(userIds);
        })

        // Connection error handler
        newSocket.on("connect_error", (error) => {
            console.error("Socket connection error:", error);
        });
    }

    // ⭐ FIXED: Socket connection with cleanup
    useEffect(()=>{
        if(authUser && !socket?.connected){
            connectSocket(authUser);
        }
        
        // Cleanup function
        return () => {
            if(socket?.connected) {
                socket.disconnect();
            }
        }
    },[authUser])

    // ⭐ FIXED: Token handling
    useEffect(()=>{
        if(token){
            axios.defaults.headers.common["token"]=token;
            checkAuth();
        }
    },[token])
    
    const value={
        axios,
        authUser,
        onlineUsers,
        socket,
        login,
        logout,
        updateProfile
    }
    
    return(
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
import React, { useContext, useEffect, useState } from 'react'
import assets from '../assets/assets'
import { ChatContext } from '../../context/ChatContext'
import { AuthContext } from '../../context/AuthContext'

const RightSidebar = () => {
  const {selectedUser, messages, deleteChat} = useContext(ChatContext)
  const {logout, onlineUsers} = useContext(AuthContext)
  const [msgImage, setMsgImage] = useState([])

  // Get all the images from the messages
  useEffect(() => {
    if (messages && messages.length > 0) {
      const images = messages
        .filter(msg => msg.image)
        .map(msg => msg.image)
      setMsgImage(images)
    } else {
      setMsgImage([])
    }
  }, [messages])

  const handleDeleteChat = async () => {
    if (!selectedUser || !selectedUser._id) {
      toast.error("No user selected");
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete chat with ${selectedUser.fullName}?`)) {
      console.log("🗑️ RightSidebar: Delete confirmed for user:", selectedUser._id);
      await deleteChat(selectedUser._id)
    } else {
      console.log("❌ RightSidebar: Delete cancelled");
    }
  }

  return selectedUser && (
    <div className={`bg-[#8185b2]/10 text-white w-full relative overflow-y-scroll ${selectedUser ? "max-md:hidden" : ""}`}>
      
      <div className='pt-16 flex flex-col items-center gap-2 text-xs font-light mx-auto'>
        <img 
          src={selectedUser?.profilePic || assets.avatar_icon} 
          alt="" 
          className='w-20 aspect-[1/1] rounded-full'
        />
        <h1 className='px-10 text-xl font-medium mx-auto flex items-center gap-2'>
          {onlineUsers?.includes(selectedUser._id) && (
            <p className='w-2 h-2 rounded-full bg-green-500'></p>
          )}
          {selectedUser.fullName}
        </h1>
        {onlineUsers?.includes(selectedUser._id) && (
          <p className='px-10 mx-auto'>{selectedUser.bio}</p>
        )}
      </div>

      <hr className='border-[#ffffff50] my-4'/>
      
      <div className='px-5 text-xs'>
        <p>Media</p>
        <div className='mt-2 max-h-[200px] overflow-y-scroll grid grid-cols-2 gap-4 opacity-80'>
          {msgImage.map((url, index) => (
            <div key={index} onClick={() => window.open(url)} className='cursor-pointer rounded'>
              <img src={url} alt="" className='h-full rounded-md'/>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Chat Button */}
      <div className='px-5 mt-4'>
        <button 
          onClick={handleDeleteChat}
          className='w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 text-sm py-2 rounded-full cursor-pointer transition-colors'
        >
          Delete Chat
        </button>
      </div>

      <button 
        onClick={() => logout()} 
        className='absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-violet-600 text-white border-none text-sm font-light py-2 px-20 rounded-full cursor-pointer'
      >
        Logout
      </button>

    </div>
  )
}

export default RightSidebar
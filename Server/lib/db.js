import mongoose from "mongoose";


// Function to connect to the mongodb databse
export const connectDB = async()=>{
    try {
        mongoose.connection.on('connected',()=>console.log('Database is connected'));
        await mongoose.connect(`${process.env.MONGODB_URL}`)
    } catch (error) {
       console.log(error) 
    }
}
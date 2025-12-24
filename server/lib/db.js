import mongoose from "mongoose";
//function to connect to the mongodb dtabase
export const connectDB = async () => {
  try {
    mongoose.connection.on('connected', () => console.log('Database Connected'));
    await mongoose.connect(`${process.env.MONGODB_URI}/we-chat`);
  } catch (error) {
    console.log(error);
  }
};
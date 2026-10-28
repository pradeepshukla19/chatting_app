const mongoose = require('mongoose');

module.exports = async function connectDB() {
  const mongoUri = process.env.MONGO_URI && process.env.MONGO_URI.trim()
    ? process.env.MONGO_URI.trim()
    : 'mongodb://127.0.0.1:27017/chat_app';

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed. Check your MONGO_URI or start MongoDB locally.');
    console.error(error.message);
    throw error;
  }
};
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const originalConnect = mongoose.connect;

test('connectDB falls back to local MongoDB when MONGO_URI is missing', async () => {
  const originalUri = process.env.MONGO_URI;
  process.env.MONGO_URI = '';

  let calledWith = null;
  mongoose.connect = async (uri) => {
    calledWith = uri;
    return Promise.resolve();
  };

  const connectDB = require('../config/db');
  await connectDB();

  assert.equal(calledWith, 'mongodb://127.0.0.1:27017/chat_app');

  mongoose.connect = originalConnect;
  process.env.MONGO_URI = originalUri;
});

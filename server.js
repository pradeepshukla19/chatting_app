require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const helmet = require('helmet');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const initSocket = require('./sockets/chat');

const app = express();
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api', chatRoutes);

const server = http.createServer(app);
const io = new Server(server);
initSocket(io);

const PORT = process.env.PORT || 3000;
connectDB()
  .then(() => server.listen(PORT, () => console.log('Server running on http://localhost:' + PORT)))
  .catch((err) => {
    console.error('DB connection failed', err.message);
    process.exit(1);
  });
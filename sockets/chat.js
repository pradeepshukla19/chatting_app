const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');
const { verifyToken } = require('../middleware/auth');
const { maskContent } = require('../utils/mask');

module.exports = function initSocket(io) {
  const online = new Map(); // userId -> open connection count

  // Authenticate every socket with the JWT
  io.use((socket, next) => {
    try {
      const payload = verifyToken(socket.handshake.auth?.token);
      socket.user = { id: String(payload.id), username: payload.username };
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const uid = socket.user.id;

    socket.join(`user:${uid}`); // personal room (works across tabs)

    online.set(uid, (online.get(uid) || 0) + 1);
    if (online.get(uid) === 1) socket.broadcast.emit('presence', { userId: uid, online: true });
    socket.emit('online_users', [...online.keys()]);

    socket.on('private_message', async (payload, ack) => {
      const done = typeof ack === 'function' ? ack : () => {};
      try {
        const { to, content } = payload || {};
        if (!mongoose.isValidObjectId(to)) return done({ error: 'Invalid receiver' });
        if (typeof content !== 'string') return done({ error: 'Invalid message' });

        const text = content.trim();
        if (!text || text.length > 1000) return done({ error: 'Message must be 1-1000 characters' });
        if (!(await User.exists({ _id: to }))) return done({ error: 'Receiver not found' });

        const masked = maskContent(text); // mask BEFORE saving/broadcasting
        const msg = await Message.create({ sender: uid, receiver: to, content: masked });

        const out = {
          _id: msg._id,
          sender: uid,
          receiver: to,
          content: msg.content,
          createdAt: msg.createdAt,
        };

        io.to(`user:${to}`).to(`user:${uid}`).emit('private_message', out);
        done({ ok: true });
      } catch (err) {
        console.error(err);
        done({ error: 'Server error' });
      }
    });

    socket.on('disconnect', () => {
      const count = (online.get(uid) || 1) - 1;
      if (count <= 0) {
        online.delete(uid);
        socket.broadcast.emit('presence', { userId: uid, online: false });
      } else online.set(uid, count);
    });
  });
};
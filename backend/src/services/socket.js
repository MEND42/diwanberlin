let io;

module.exports = {
  init: (httpServer) => {
    io = require('socket.io')(httpServer, {
      cors: {
        origin: "*", // Allow all origins for dev. In prod, restrict to domain.
        methods: ["GET", "POST", "PATCH", "DELETE"]
      }
    });
    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error("Socket.io not initialized!");
    }
    return io;
  }
};

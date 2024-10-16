const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const { Subject } = require("rxjs");

// Conexión a MongoDB
mongoose
  .connect(
    "mongodb+srv://admin:kzT52fgPMgEcbMaW@chat-cluster.tk8jl.mongodb.net/?retryWrites=true&w=majority&appName=chat-cluster",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("Conectado a MongoDB"))
  .catch((err) => console.error("Error al conectar a MongoDB:", err));

// Definir esquema de mensaje
const messageSchema = new mongoose.Schema({
  chatId: String,
  sender: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", messageSchema);

// Inicializar Express y Socket.IO
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // URL del frontend
    methods: ["GET", "POST"],
  },
});

// Crear un Observer para manejar suscripciones
const chatObserver = new Subject();

// Middleware de suscripción al chat
const subscribeToChat = (chatId, socket) => {
  const subscription = chatObserver.subscribe(({ id, message }) => {
    if (id === chatId) {
      socket.emit("new-message", message);
    }
  });

  socket.on("disconnect", () => subscription.unsubscribe());
};

// Rutas de API
app.get("/messages/:chatId", async (req, res) => {
  const { chatId } = req.params;
  const { limit = 20, skip = 0 } = req.query;

  try {
    const messages = await Message.find({ chatId })
      .sort({ timestamp: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Error al cargar mensajes" });
  }
});

// Manejar conexión con Socket.IO
io.on("connection", (socket) => {
  console.log("Cliente conectado");

  socket.on("subscribe", (chatId) => {
    console.log(`Cliente suscrito al chat: ${chatId}`);
    subscribeToChat(chatId, socket);
  });

  socket.on("send-message", async (chatId, sender, content) => {
    const message = new Message({ chatId, sender, content });
    await message.save();

    // Notificar a los suscriptores del chat
    chatObserver.next({ id: chatId, message });
  });
});

// Iniciar servidor en puerto 5000
const PORT = 5000;
server.listen(PORT, () =>
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
);

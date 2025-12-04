const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT || 3000;

// Global error handlers
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Inicializar Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const httpServer = createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });

    // Inicializar Socket.IO
    const { initIO } = require("./lib/socketServer");
    const io = initIO(httpServer);

    // Iniciar worker de recordatorios si el módulo está disponible
    try {
      const { startReminderWorker } = require("./lib/reminderWorker");
      startReminderWorker();
    } catch (e) {
      console.warn("Reminder worker no disponible:", e && e.message);
    }

    httpServer.listen(port, (err) => {
      if (err) throw err;
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.IO server initialized`);
    });
  })
  .catch((ex) => {
    console.error(ex.stack);
    process.exit(1);
  });

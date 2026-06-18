import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import chalk from "chalk";

// Создаем HTTP-сервер
const server = http.createServer((request, response) => {
  // Этот код нужен только для стандартных HTTP-запросов (GET, POST и др.)
  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("This is a WebSocket server.");
});

// Присваиваем WebSocket-сервер нашему HTTP-серверу
const wss = new WebSocketServer({ server });

// Стартуем HTTP-сервер
server.listen(5050, () => {
  console.log(chalk.yellow("WebSocket server running on port"), chalk.bold.green(" 5050"));
});

// Поддержка CORS на этапе Handshake
wss.on("headers", (headers: any, request: any) => {
  headers["access-control-allow-origin"] = "*"; // Можно заменить на точный домен
  headers["access-control-allow-methods"] = "GET, POST, OPTIONS";
  headers["access-control-allow-headers"] = "Content-Type, Authorization";
});



















// import {express} from 'express'
// import {createServer} from 'http'
// import {Server} from 'socket.io'
// import {WebSocketHandler} from './websocket.js'

// const app = express()
// const httpServer = createServer(app)
// const io = new Server(httpServer, {
//     cors: {
//         origin: '*',
//     },
// })

// io.on('connection', (socket) => {
//     console.log('a user connected')
//     WebSocketHandler(socket)
// })

// const PORT = process.env.PORT || 3001
// httpServer.listen(PORT, () => {
//  console.log(`WebSocket server is running on port ${PORT}`)
// })
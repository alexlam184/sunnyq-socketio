// src/index.js

import { instrument } from '@socket.io/admin-ui';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { MESSAGE } from './enum';
import { codetoRoomMap } from './lobby';
import { User } from './type';

dotenv.config();

const port = process.env.PORT || 3000;
const hostname = process.env.hostname || 'localhost';
const client_url = process.env.client_url || 'http://localhost:3000';

const app: Express = express();

app.use(cors());
const httpServer = createServer(app);
console.log('client_url=', client_url);

const io = new Server(httpServer, {
  cors: {
    origin: [client_url, 'https://admin.socket.io', 'http://localhost:3000'], // docker local may not set http://localhost:3000, therefore, it cannot run in local
    methods: ['GET', 'POST'],
    allowedHeaders: ['my-custom-header'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log(`Server: user connected: ${socket.id}`);

  const deleteRoom = (roomCode: string) => {
    if (!codetoRoomMap.has(roomCode)) {
      console.log(`Room doesn't exist`);
      return;
    }
    // Clear lobby storage
    codetoRoomMap.delete(roomCode);
    console.log(`Room ${roomCode} has been deleted.`);

    // request all users to leave room
    socket.to(roomCode).emit('room:fetch-request', 'leave-room');

    // Clear all users from the socket room
    io.in(roomCode).socketsLeave(roomCode);
  };

  const leaveRoom = (roomCode: string, userid: string) => {
    if (!codetoRoomMap.has(roomCode)) {
      console.log(`Room doesn't exist`);
      return;
    }

    // Leave socketIO room
    socket.leave(roomCode);

    // Get room
    const room = codetoRoomMap.get(roomCode)!;

    // Remove Player
    room.users.map((user: User, index: number) => {
      if (user.userid === userid) {
        room.users.splice(index, 1);
        room.num_of_students--;
        // Fetch other users in the room
        socket.to(roomCode).emit('room:fetch-request', 'fetch-room', room);

        // Early exit
        return;
      }
    });
  };

  socket.on(MESSAGE.DISCONNECT, () => {
    codetoRoomMap.forEach((room, roomCode: string) => {
      // host disconnect
      if (room.host.userid === socket.id) {
        deleteRoom(roomCode);
        return;
      }
      // user disconnect
      room.users.map((user: User) => {
        if (user.userid === socket.id) {
          leaveRoom(roomCode, socket.id);
          return;
        }
      });
    });
    console.log(`Server: user disconnected: ${socket.id}`);
  });

  /**
   * Fetch an userId.
   */
  socket.on(MESSAGE.FETCH_USERID, (callback) => {
    callback(socket.id);
    console.log(`Server: User ID ${socket.id} fetched.`);
  });

  /**
   * Fetch a lobby.
   */
  socket.on(MESSAGE.FETCH_LOBBY, (callback) => {
    callback(Array.from(codetoRoomMap.keys()));
    console.log(`Server: Lobby fetched.`);
  });

  /**
   * Create a new room and join it as the host.
   */
  socket.on(MESSAGE.CREATE_ROOM, ({ roomCode, room }) => {
    codetoRoomMap.set(roomCode, room);
    socket.join(roomCode); // Host join the room
    console.log(`Server: Room ${roomCode} was created.`);
  });

  /**
   * Fetch a room by its code.
   */
  socket.on(MESSAGE.FETCH_ROOM, (roomCode, callback) => {
    callback(codetoRoomMap.get(roomCode));
    console.log(`Server: Room fetched.`);
  });

  /**
   * User joins a room.
   */
  socket.on(MESSAGE.JOIN_ROOM, ({ roomCode, user }) => {
    if (!codetoRoomMap.has(roomCode)) {
      console.log(`Room doesn't exist`);
      return;
    }
    // Join socketIO room
    socket.join(roomCode);

    // Get room
    const room = codetoRoomMap.get(roomCode)!;

    // Update Room
    room.users.push(user);
    room.num_of_students++;

    socket.to(roomCode).emit('room:fetch-request', 'fetch-room', room);

    console.log(`Server: user ${socket.id} has joined room ${roomCode}`);
  });

  /**
   * User leaves a room.
   */
  socket.on('room:leave-room', ({ roomCode }) => {
    if (!codetoRoomMap.has(roomCode)) {
      console.log(`Room doesn't exist`);
      return;
    }
    // Leave socketIO room
    socket.leave(roomCode);

    // Get room
    const room = codetoRoomMap.get(roomCode)!;

    // Update Room
    room.users.map((user, index) => {
      if (user.userid === socket.id) room.users.splice(index, 1);
    });
    room.num_of_students--;

    console.log(`Server: user ${socket.id} left room ${roomCode}`);
  });

  /**
   * Submit all answers in a room.
   */
  socket.on(MESSAGE.SUBMIT_ANSWER, ({ roomCode, userid, answers }) => {
    if (!codetoRoomMap.has(roomCode)) {
      console.log(`Room doesn't exist`);
      return;
    }
    // Get room
    const room = codetoRoomMap.get(roomCode)!;

    // Get user
    const user = room.users.find((user) => userid == user.userid);
    if (!user) {
      console.log(`Player doesn't exist`);
      return;
    }

    // Update room
    user.answers = answers;
    room.num_of_answered++;

    // Fetch other users in the room
    socket.to(roomCode).emit(MESSAGE.FETCH_REQUEST, 'fetch-room', room);
  });

  /**
   * Change Room Data
   */
  socket.on(MESSAGE.CHANGE_ROOM_DATA, ({ roomCode, data }) => {
    console.log(codetoRoomMap);
    if (!codetoRoomMap.has(roomCode)) {
      console.log(`Room doesn't exist`);
      return;
    }
    // Get room
    const room = codetoRoomMap.get(roomCode)!;

    // Change room data
    Object.assign(room, data);
    console.log(room);

    // Fetch other users in the room
    socket.to(roomCode).emit(MESSAGE.FETCH_REQUEST, 'fetch-room', room);
  });

  /**
   * Delete a room.
   */
  socket.on(MESSAGE.DELETE_ROOM, ({ roomCode }) => {
    deleteRoom(roomCode);
  });
});

instrument(io, {
  auth: false,
  mode: 'development',
});

app.get('/', (req: Request, res: Response) => {
  res.send('SunnyQ Socket.io Express + TypeScript Server');
});

// Magic Lines
httpServer.prependListener('request', (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
});

httpServer
  .once('error', (err) => {
    console.error(err);
    process.exit(1);
  })
  .listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });

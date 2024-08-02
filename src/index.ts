// src/index.js

import { instrument } from '@socket.io/admin-ui';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { codetoRoomMap } from './lobby';
import { ROOM_PHASE } from './room-phase';
import { User } from './type';

dotenv.config();

const port = process.env.PORT || 3000;
const hostname = process.env.hostname || 'localhost';
const client_url = process.env.client_url || 'http://localhost:3000';

const app: Express = express();

app.use(cors());
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [client_url, 'https://admin.socket.io'],
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

        // Fetch other users in the room
        socket.to(roomCode).emit('room:fetch-request', 'fetch-room', room);

        // Early exit
        return;
      }
    });
  };

  socket.on('disconnect', () => {
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
  socket.on('user:fetch-id', (callback) => {
    callback(socket.id);
    console.log(`Server: User ID ${socket.id} fetched.`);
  });

  /**
   * Fetch a lobby.
   */
  socket.on('lobby:fetch-lobby', (callback) => {
    callback(Array.from(codetoRoomMap.keys()));
    console.log(`Server: Lobby fetched.`);
  });

  /**
   * Create a new room and join it as the host.
   */
  socket.on('lobby:host-create-room', ({ roomCode, room }) => {
    codetoRoomMap.set(roomCode, room);
    socket.join(roomCode); // Host join the room
    console.log(`Server: Room ${roomCode} was created.`);
  });

  /**
   * Fetch a room by its code.
   */
  socket.on('room:fetch-room', (roomCode, callback) => {
    callback(codetoRoomMap.get(roomCode));
    console.log(`Server: Room fetched.`);
  });

  /**
   * User joins a room.
   */
  socket.on('room:join-room', ({ roomCode, user }) => {
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
    socket.leave(roomCode);
    console.log(`Server: user ${socket.id} left room ${roomCode}`);
  });

  /**
   * Submit an answer in a room.
   */
  socket.on('room:submit-answer', ({ roomCode, userid, answer }) => {
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
    user.answer = answer;
    room.num_of_answered++;

    // Fetch other users in the room
    socket.to(roomCode).emit('room:fetch-request', 'fetch-room', room);
  });

  /**
   * Pause the room.
   */
  socket.on('room:pause-room', ({ roomCode }) => {
    if (!codetoRoomMap.has(roomCode)) {
      console.log(`Room doesn't exist`);
      return;
    }
    // Get room
    const room = codetoRoomMap.get(roomCode)!;

    // Pause the room
    room.phase = ROOM_PHASE.PAUSE;

    // Fetch other users in the room
    socket.to(roomCode).emit('room:fetch-request', 'fetch-room', room);
  });

  /**
   * Delete a room.
   */
  socket.on('room:delete-room', ({ roomCode }) => {
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

"use client";

import { io, Socket } from "socket.io-client";

const DEFAULT_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(DEFAULT_URL, { transports: ["websocket", "polling"] });
  }
  return socket;
}

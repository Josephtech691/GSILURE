import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? 'https://gsilures.onrender.com/api' : '/api');

const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem('token');
    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
    socket = null;
  }
};

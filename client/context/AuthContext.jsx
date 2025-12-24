import { createContext, useState, useEffect } from "react";
import axios from 'axios';
import toast from "react-hot-toast";
import io from 'socket.io-client';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

// Create a fresh axios instance without withCredentials
const axiosInstance = axios.create({
  baseURL: backendUrl,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [authUser, setAuthUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);

  // Check if user is authenticated and if so, set the user data and connect the socket
  const checkAuth = async () => {
    try {
      const { data } = await axiosInstance.get("/api/auth/check");
      if (data.success) {
        setAuthUser(data.user);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      // Don't show toast for auth check failures
    }
  };

  // Login function to handle user authentication and socket connection
  const login = async (state, credentials) => {
    try {
      const { data } = await axiosInstance.post(`/api/auth/${state}`, credentials);
      if (data.success) {
        setAuthUser(data.userData);
        axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
        setToken(data.token);
        localStorage.setItem("token", data.token);
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Login failed";
      toast.error(errorMessage);
    }
  }

  // Logout function to handle user logout and socket disconnection
  const logout = async () => {
    localStorage.removeItem("token");
    setToken(null);
    setAuthUser(null);
    setOnlineUsers([]);
    delete axiosInstance.defaults.headers.common["Authorization"];
    toast.success("Logged out successfully");
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  }

  // Update profile function to handle user profile updates
  const updateProfile = async (body) => {
    try {
      const { data } = await axiosInstance.put("/api/auth/update-profile", body);
      if (data.success) {
        setAuthUser(data.user);
        toast.success("Profile updated successfully");
      } else {
        toast.error(data.message || "Failed to update profile");
      }
      return data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to update profile";
      toast.error(errorMessage);
      throw error;
    }
  }

  useEffect(() => {
    if (token) {
      axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      checkAuth();
    }
  }, [token]);

  // Connect to socket when user is authenticated
  useEffect(() => {
    if (authUser) {
      const newSocket = io(backendUrl, {
        query: { userId: authUser._id }
      });
      setSocket(newSocket);

      newSocket.on("getOnlineUsers", (users) => {
        setOnlineUsers(users);
      });

      return () => {
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
      }
    }
  }, [authUser]);

  const value = {
    token,
    setToken,
    authUser,
    setAuthUser,
    onlineUsers,
    socket,
    axios: axiosInstance,  // Export the custom axios instance
    login,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
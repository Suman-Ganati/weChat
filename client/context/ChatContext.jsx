import { createContext, useState, useContext, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { AuthContext } from "./AuthContext";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {

  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});

  const {socket, axios} = useContext(AuthContext);

  // function to get all users for sidebar
  const getUsers = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/messages/users");
      if (data.success) {
        setUsers(data.users);
        setUnseenMessages(data.unseenMessages);
      }
    } catch (error) {
      toast.error(error.message);
    }
  }, [axios]);

  // function to get messages for selected user
  const getMessages = useCallback(async (userId) => {
    try {
      const { data } = await axios.get(`/api/messages/${userId}`);
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      toast.error(error.message);
    }
  }, [axios]);

  // function to send message to selected user
  const sendMessage = useCallback(async (messageData) => {
    try {
      const {data} = await axios.post(`/api/messages/send/${selectedUser._id}`, messageData);
      if (data.success) {
        setMessages((prevMessages) => [...prevMessages, data.newMessage]);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  }, [axios, selectedUser]);

  // function to subscribe to messages for selected user
  const subscribeToMessages = useCallback(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        newMessage.seen = true;
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        axios.put(`/api/messages/mark/${newMessage._id}`);
      } else {
        setUnseenMessages((prevUnseenMessages) => ({
          ...prevUnseenMessages, 
          [newMessage.senderId]: prevUnseenMessages[newMessage.senderId] 
            ? prevUnseenMessages[newMessage.senderId] + 1 
            : 1
        }));
      }
    };

    socket.on("newMessage", handleNewMessage);

    // Return cleanup function
    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, selectedUser, axios]);

  // function to unsubscribe from messages
  const unsubscribeFromMessages = useCallback(() => {
    if (socket) socket.off("newMessage");
  }, [socket]);

  useEffect(() => {
    const cleanup = subscribeToMessages();
    return () => {
      if (cleanup) cleanup();
      unsubscribeFromMessages();
    };
  }, [subscribeToMessages, unsubscribeFromMessages]);

  const value = {
    messages, 
    users, 
    selectedUser, 
    getUsers, 
    getMessages,
    setMessages, 
    sendMessage,
    setSelectedUser, 
    unseenMessages, 
    setUnseenMessages
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
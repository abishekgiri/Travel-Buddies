import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import ThemeToggle from './components/ThemeToggle';
import ChatBot from './components/ChatBot';
import ToastNotification from './components/ToastNotification';
import Home from './pages/Home';
import FindTravelers from './pages/FindTravelers';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Signup from './pages/Signup';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminDashboard from './pages/AdminDashboard';
import AdminTripCreator from './pages/AdminTripCreator';
import TransportSearch from './pages/TransportSearch';
import Trips from './pages/Trips';
import TripDetails from './pages/TripDetails';
import BudgetPlanner from './pages/BudgetPlanner';
import { API_URL, createSocketOptions } from './config';
import './index.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

// Separate component to use hooks inside Router/AuthProvider
const AppContent = () => {
  const { user } = useAuth();
  const [notification, setNotification] = React.useState(null);

  React.useEffect(() => {
    if (!user) {
      return undefined;
    }

    const socket = io(API_URL, createSocketOptions());
    socket.emit('user_online');

    socket.on('notification', (data) => {
      setNotification({
        ...data,
        _id: `${Date.now()}-${Math.random()}`
      });
    });

    return () => socket.disconnect();
  }, [user]);

  return (
    <div className="app">
      <Navbar />
      <ThemeToggle />
      {notification && (
        <ToastNotification
          key={notification._id}
          message={notification}
          onClose={() => setNotification(null)}
        />
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/find-travelers" element={<FindTravelers />} />
        <Route path="/trips" element={<Trips />} />
        <Route path="/trips/:id" element={<TripDetails />} />
        <Route path="/trips/:tripId/budget" element={
          <PrivateRoute>
            <BudgetPlanner />
          </PrivateRoute>
        } />
        <Route path="/admin" element={
          <PrivateRoute>
            <AdminDashboard />
          </PrivateRoute>
        } />
        <Route path="/admin/create-trip" element={
          <PrivateRoute>
            <AdminTripCreator />
          </PrivateRoute>
        } />
        <Route path="/chat" element={
          <PrivateRoute>
            <Chat />
          </PrivateRoute>
        } />
        <Route path="/transport" element={
          <PrivateRoute>
            <TransportSearch />
          </PrivateRoute>
        } />
        <Route path="/profile" element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        } />
        <Route path="/profile/:userId" element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        } />
      </Routes>
      <ChatBot />
    </div>
  );
};

export default App;

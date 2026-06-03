import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ContactsPage from './pages/ContactsPage';
import ActivitiesPage from './pages/ActivitiesPage';
import SmartTasksPage from './pages/SmartTasksPage';
import MessagesPage from './pages/MessagesPage';
import CalendarPage from './pages/CalendarPage';
import CommitmentsPage from './pages/CommitmentsPage';
import PlaceholderPage from './pages/PlaceholderPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="activities" element={<ActivitiesPage />} />
          <Route path="smart-tasks" element={<SmartTasksPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="commitments" element={<CommitmentsPage />} />
          <Route path="deals" element={<PlaceholderPage title="Deals" />} />
          <Route path="reports" element={<PlaceholderPage title="Reports" />} />
          <Route path="automations" element={<PlaceholderPage title="Automations" />} />
          <Route path="settings" element={<PlaceholderPage title="Settings" />} />
        </Route>
      </Route>
    </Routes>
  );
}

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GuestAuthProvider } from './contexts/GuestAuthContext';
import { GuestLayout } from './components/GuestLayout';
import { LoginPage } from './pages/LoginPage';
import { MyReservationsPage } from './pages/MyReservationsPage';
import { MyProfilePage } from './pages/MyProfilePage';
import { DashboardPage } from './pages/DashboardPage';

export function App() {
  return (
    <GuestAuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<GuestLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="reservas" element={<MyReservationsPage />} />
            <Route path="perfil" element={<MyProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </GuestAuthProvider>
  );
}

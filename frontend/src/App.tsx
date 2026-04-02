import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AntragFormular from './pages/AntragFormular';
import AntragEingereicht from './pages/AntragEingereicht';
import AntragStatus from './pages/AntragStatus';
import VorstandLogin from './pages/VorstandLogin';
import VorstandDashboard from './pages/VorstandDashboard';
import VorstandAntrag from './pages/VorstandAntrag';
import PrivateRoute from './components/PrivateRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Öffentliche Seiten */}
        <Route path="/" element={<AntragFormular />} />
        <Route path="/antrag-eingereicht/:id" element={<AntragEingereicht />} />
        <Route path="/status" element={<AntragStatus />} />

        {/* Vorstand */}
        <Route path="/vorstand/login" element={<VorstandLogin />} />
        <Route path="/vorstand/dashboard" element={
          <PrivateRoute><VorstandDashboard /></PrivateRoute>
        } />
        <Route path="/vorstand/antrag/:id" element={
          <PrivateRoute><VorstandAntrag /></PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

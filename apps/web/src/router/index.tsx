import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthLayout } from '../layouts/AuthLayout';
import { MainLayout } from '../layouts/MainLayout';
import { ProtectedRoute } from './ProtectedRoute';

import { Login } from '../features/auth/Login';
import { Register } from '../features/auth/Register';
import { Dashboard } from '../features/dashboard/Dashboard';
import { CreateGroup } from '../features/groups/CreateGroup';
import { GroupDetails } from '../features/groups/GroupDetails';
import { ProfileSettings } from '../features/profile/ProfileSettings';
import { InviteAccept } from '../features/groups/InviteAccept';
import { NotFound } from '../features/errors/NotFound';
import { Terms } from '../features/legal/Terms';
import { Privacy } from '../features/legal/Privacy';

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Public Legal Routes */}
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />

        {/* Public Invite Token Acceptance Route */}
        <Route path="/invite/:token" element={<InviteAccept />} />

        {/* Protected Dashboard/App Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/groups/new" element={<CreateGroup />} />
            <Route path="/groups/:groupId" element={<GroupDetails />} />
            <Route path="/invites" element={<Navigate to="/profile?tab=invites" replace />} />
            <Route path="/profile" element={<ProfileSettings />} />
          </Route>
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { OnboardingProvider } from './context/OnboardingContext';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute, RequireRoles } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectCreatePage } from './pages/ProjectCreatePage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { AllocationsPage } from './pages/AllocationsPage';
import { LeavesPage } from './pages/LeavesPage';
import { HeatmapPage } from './pages/HeatmapPage';
import { ForecastPage } from './pages/ForecastPage';
import { SkillMatrixPage } from './pages/SkillMatrixPage';
import { ReportsPage } from './pages/ReportsPage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OnboardingProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route index element={
                    <RequireRoles roles={['admin', 'director', 'pm']} fallback="/projects">
                      <DashboardPage />
                    </RequireRoles>
                  } />
                  <Route path="projects" element={<ProjectsPage />} />
                  <Route path="projects/new" element={
                    <RequireRoles roles={['admin', 'director', 'pm']}>
                      <ProjectCreatePage />
                    </RequireRoles>
                  } />
                  <Route path="projects/:id" element={<ProjectDetailPage />} />
                  <Route path="resources" element={
                    <RequireRoles roles={['admin', 'director', 'pm']}>
                      <ResourcesPage />
                    </RequireRoles>
                  } />
                  <Route path="allocations" element={
                    <RequireRoles roles={['admin', 'director', 'pm']}>
                      <AllocationsPage />
                    </RequireRoles>
                  } />
                  <Route path="leaves" element={
                    <RequireRoles roles={['admin', 'director', 'pm']}>
                      <LeavesPage />
                    </RequireRoles>
                  } />
                  <Route path="heatmap" element={
                    <RequireRoles roles={['admin', 'director', 'pm']}>
                      <HeatmapPage />
                    </RequireRoles>
                  } />
                  <Route path="forecast" element={
                    <RequireRoles roles={['admin', 'director', 'pm']}>
                      <ForecastPage />
                    </RequireRoles>
                  } />
                  <Route path="skill-matrix" element={
                    <RequireRoles roles={['admin', 'director', 'pm']}>
                      <SkillMatrixPage />
                    </RequireRoles>
                  } />
                  <Route path="reports" element={
                    <RequireRoles roles={['admin', 'director', 'pm']}>
                      <ReportsPage />
                    </RequireRoles>
                  } />
                  <Route path="admin" element={
                    <RequireRoles roles={['admin']}>
                      <AdminPage />
                    </RequireRoles>
                  } />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </OnboardingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { OnboardingProvider } from './context/OnboardingContext';
import { Layout } from './components/Layout';
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

export default function App() {
  return (
    <ThemeProvider>
      <OnboardingProvider>
        <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/new" element={<ProjectCreatePage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="allocations" element={<AllocationsPage />} />
            <Route path="leaves" element={<LeavesPage />} />
            <Route path="heatmap" element={<HeatmapPage />} />
            <Route path="forecast" element={<ForecastPage />} />
            <Route path="skill-matrix" element={<SkillMatrixPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>
        </Routes>
        </BrowserRouter>
      </OnboardingProvider>
    </ThemeProvider>
  );
}

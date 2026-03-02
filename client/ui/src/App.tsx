import { Routes, Route } from 'react-router-dom';
import { AppProviders } from './providers/AppProviders.js';
import { LoginPage } from './features/auth/LoginPage.js';
import { RegisterPage } from './features/auth/RegisterPage.js';
import { DashboardPage } from './features/dashboard/DashboardPage.js';
import { DocumentsPage } from './pages/DocumentsPage.js';
import { GraphPage } from './pages/GraphPage.js';
import { VersionsPage } from './pages/VersionsPage.js';
import { GenUiPage } from './pages/GenUiPage.js';
import { SettingsPage } from './features/settings/SettingsPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';
import { routes } from './routes/index.js';

function AppRoutes() {
  return (
    <Routes>
      <Route path={routes.login} element={<LoginPage />} />
      <Route path={routes.register} element={<RegisterPage />} />
      <Route path={routes.dashboard} element={<DashboardPage />} />
      <Route path={routes.documents} element={<DocumentsPage />} />
      <Route path={routes.graph} element={<GraphPage />} />
      <Route path="/versions" element={<VersionsPage />} />
      <Route path={routes.genui} element={<GenUiPage />} />
      <Route path={routes.settings} element={<SettingsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}

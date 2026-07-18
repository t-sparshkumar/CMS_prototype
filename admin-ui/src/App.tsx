import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AuthBootstrapGate from './components/AuthBootstrapGate';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardPage from './pages/DashboardPage';
import AssetGalleryPage from './pages/AssetGalleryPage';
import HistoryPage from './pages/HistoryPage';
import UsersPage from './pages/UsersPage';
import PagesDashboardPage from './pages/PagesDashboardPage';
import PageEditPage from './pages/PageEditPage';
import PagePreviewPage from './pages/PagePreviewPage';
import ContentItemPage from './pages/ContentItemPage';
import ContentListPage from './pages/ContentListPage';
import AccessControlPage from './pages/AccessControlPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import CollectionsListPage from './pages/data-model/CollectionsListPage';
import NewCollectionPage from './pages/data-model/NewCollectionPage';
import DataModelLayout from './pages/data-model/DataModelLayout';
import CollectionFieldsPage from './pages/data-model/CollectionFieldsPage';
import CollectionSetupPage from './pages/data-model/CollectionSetupPage';
import CollectionRelationsPage from './pages/data-model/CollectionRelationsPage';
import FieldDetailPage from './pages/data-model/FieldDetailPage';
import NewFieldPage from './pages/data-model/NewFieldPage';
import TriggersPage from './pages/TriggersPage';
import FlowEditorPage from './pages/FlowEditorPage';
import TranslationsPage from './pages/TranslationsPage';
import { useAuthStore } from './stores/authStore';

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const bootstrapAuth = useAuthStore((s) => s.bootstrapAuth);

  useEffect(() => {
    void bootstrapAuth();
  }, [bootstrapAuth]);

  if (isBootstrapping) {
    return <AuthBootstrapGate>{null}</AuthBootstrapGate>;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets"
        element={
          <ProtectedRoute>
            <AssetGalleryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pages"
        element={
          <ProtectedRoute>
            <PagesDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pages/new"
        element={
          <ProtectedRoute>
            <PageEditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pages/:id/preview"
        element={
          <ProtectedRoute>
            <PagePreviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pages/:id/edit"
        element={
          <ProtectedRoute>
            <PageEditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pages/:id/preview"
        element={
          <ProtectedRoute>
            <PagePreviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/components"
        element={
          <ProtectedRoute>
            <Navigate to="/content" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/users"
        element={
          <ProtectedRoute>
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/triggers"
        element={
          <ProtectedRoute>
            <TriggersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/triggers/:id"
        element={
          <ProtectedRoute>
            <FlowEditorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/translations"
        element={
          <ProtectedRoute>
            <TranslationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/data-model"
        element={
          <ProtectedRoute>
            <CollectionsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/data-model/new"
        element={
          <ProtectedRoute>
            <NewCollectionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/data-model/:collection"
        element={
          <ProtectedRoute>
            <DataModelLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CollectionFieldsPage />} />
        <Route path="setup" element={<CollectionSetupPage />} />
        <Route path="relations" element={<CollectionRelationsPage />} />
        <Route path="fields/new" element={<NewFieldPage />} />
        <Route path="fields/:field" element={<FieldDetailPage />} />
      </Route>
      <Route
        path="/content"
        element={
          <ProtectedRoute>
            <ContentListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/content/:collection"
        element={
          <ProtectedRoute>
            <ContentListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/content/:collection/:id"
        element={
          <ProtectedRoute>
            <ContentItemPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/access-control"
        element={
          <ProtectedRoute>
            <AccessControlPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/project"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardPage from './pages/DashboardPage';
import AssetGalleryPage from './pages/AssetGalleryPage';
import HistoryPage from './pages/HistoryPage';
import UsersPage from './pages/UsersPage';
import UserCreatePage from './pages/UserCreatePage';
import PagesDashboardPage from './pages/PagesDashboardPage';
import PageEditPage from './pages/PageEditPage';
import ComponentsLibraryPage from './pages/ComponentsLibraryPage';
import GlobalLayoutPage from './pages/GlobalLayoutPage';
import ContentItemPage from './pages/ContentItemPage';
import ContentListPage from './pages/ContentListPage';
import AccessControlPage from './pages/AccessControlPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import CollectionsListPage from './pages/data-model/CollectionsListPage';
import NewCollectionPage from './pages/data-model/NewCollectionPage';
import DataModelLayout from './pages/data-model/DataModelLayout';
import CollectionFieldsPage from './pages/data-model/CollectionFieldsPage';
import CollectionSetupPage from './pages/data-model/CollectionSetupPage';
import CollectionRelationsPage from './pages/data-model/CollectionRelationsPage';
import FieldDetailPage from './pages/data-model/FieldDetailPage';
import NewFieldPage from './pages/data-model/NewFieldPage';
import { useAuthStore } from './stores/authStore';

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

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
        path="/pages/:id/edit"
        element={
          <ProtectedRoute>
            <PageEditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/components"
        element={
          <ProtectedRoute>
            <ComponentsLibraryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/global-layout"
        element={
          <ProtectedRoute>
            <GlobalLayoutPage />
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
        path="/settings/users/new"
        element={
          <ProtectedRoute>
            <UserCreatePage />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

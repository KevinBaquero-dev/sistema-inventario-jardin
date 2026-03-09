// =============================================================================
// src/App.tsx
// =============================================================================
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider }    from './components/ui/Toast'
import LoginPage            from './pages/auth/LoginPage'
import DashboardPage        from './pages/dashboard/DashboardPage'
import UsersPage            from './pages/users/UsersPage'
import SectionsPage         from './pages/sections/SectionsPage'
import SectionProductsPage  from './pages/products/SectionProductsPage'
import ProductsPage         from './pages/products/ProductsPage'
import MovementsPage        from './pages/movements/MovementsPage'
import SettingsPage         from './pages/settings/SettingsPage'
import AppLayout            from './components/layout/AppLayout'
import ProtectedRoute       from './components/layout/ProtectedRoute'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 * 2 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"                      element={<DashboardPage />} />
              <Route path="sections"                       element={<SectionsPage />} />
              <Route path="sections/:sectionId/products"   element={<SectionProductsPage />} />
              <Route path="products"                       element={<ProductsPage />} />
              <Route path="reports"                        element={<MovementsPage />} />
              <Route path="movements"                      element={<Navigate to="/reports" replace />} />
              <Route path="users"                          element={<UsersPage />} />
              <Route path="settings"                       element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}

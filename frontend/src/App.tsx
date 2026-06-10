import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { AppProvider } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { UploadFieldsPage } from './pages/UploadFieldsPage';
import { UploadFieldFormPage } from './pages/UploadFieldFormPage';
import { UploadsPage } from './pages/UploadsPage';
import { OrdersPage } from './pages/OrdersPage';
import { BillingPage } from './pages/BillingPage';
import { SettingsPage } from './pages/SettingsPage';
import { AppLayout } from './components/layout/AppLayout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

// This component automatically saves the token from URL to localStorage
function TokenHandler({ children }: { children: React.ReactNode }) {
  const [params] = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    const shop = params.get('shop');

    if (token) {
      // Save JWT token to localStorage
      localStorage.setItem('cfup_token', token);
      if (shop) localStorage.setItem('cfup_shop', shop);

      // Clean URL - remove token from address bar
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, [params]);

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider i18n={enTranslations}>
        <BrowserRouter>
          <TokenHandler>
            <Routes>
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="fields" element={<UploadFieldsPage />} />
                <Route path="fields/new" element={<UploadFieldFormPage />} />
                <Route path="fields/:id/edit" element={<UploadFieldFormPage />} />
                <Route path="uploads" element={<UploadsPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          </TokenHandler>
        </BrowserRouter>
      </AppProvider>
    </QueryClientProvider>
  );
}

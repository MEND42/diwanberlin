import { AppRouter } from '@/router';
import { ToastProvider } from '@/components/Toast';
import { AdminI18nProvider } from '@/lib/adminI18n';

export default function App() {
  return (
    <AdminI18nProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </AdminI18nProvider>
  );
}

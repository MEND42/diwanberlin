import { AppRouter } from '@/router';
import { ToastProvider } from '@/components/Toast';

export default function App() {
  return (
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  );
}

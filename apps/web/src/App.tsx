import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from './router';
import { ToastContainer } from './components/ui/Toast';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Wallet } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const { initializeTheme } = useThemeStore();
  const { user, isInitialized, initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (isInitialized) {
      initializeTheme();
    }
  }, [user, isInitialized, initializeTheme]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 max-w-xs w-full text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-white border border-gray-200">
            <Wallet className="w-5 h-5 text-gray-900 animate-[pulse_2s_ease-in-out_infinite]" />
          </div>

          <div className="flex flex-col items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-gray-900">Monetely</h2>
            <div className="flex items-center gap-1.5">
              <svg className="animate-spin h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-xs text-gray-500">
                Setting up environment...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AppRouter />
        <ToastContainer />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;


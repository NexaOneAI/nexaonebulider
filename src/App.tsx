import { Providers } from './app/providers';
import { AppRouter } from './app/router';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EnvMissingScreen } from './components/EnvMissingScreen';
import { getMissingSupabaseEnv } from './lib/env';

const App = () => {
  // Early bail-out: if required VITE_* vars are missing, show a friendly
  // screen instead of mounting the rest of the tree (which would crash on
  // Supabase calls or hang on auth init).
  const missingEnv = getMissingSupabaseEnv();
  if (missingEnv.length > 0) {
    // eslint-disable-next-line no-console
    console.error('[App] Missing required env vars:', missingEnv.join(', '));
    return <EnvMissingScreen missing={missingEnv} />;
  }

  return (
    <ErrorBoundary>
      <Providers>
        <AppRouter />
      </Providers>
    </ErrorBoundary>
  );
};

export default App;

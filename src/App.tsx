import { Providers } from './app/providers';
import { AppRouter } from './app/router';

const App = () => (
  <Providers>
    <AppRouter />
  </Providers>
);

export default App;

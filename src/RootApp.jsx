import { useState } from 'react';
import App from './App.jsx';
import { CanvasHome } from './pages/CanvasHome.jsx';
import { StripeReturn } from './pages/StripeReturn.jsx';
import { resolveInitialView } from './lib/routing.js';
import GlobalLoadingOverlay from './components/GlobalLoadingOverlay.jsx';

export default function RootApp() {
  const [view] = useState(() => resolveInitialView());

  return (
    <>
      {view === 'stripe-return' ? <StripeReturn /> : null}
      {view === 'editor' ? <App /> : null}
      {view === 'home' ? <CanvasHome /> : null}
      <GlobalLoadingOverlay />
    </>
  );
}

import { lazy, Suspense, useState } from 'react';
import { resolveInitialView } from './lib/routing.js';
import GlobalLoadingOverlay from './components/GlobalLoadingOverlay.jsx';

const App = lazy(() => import('./App.jsx'));
const CanvasHome = lazy(() =>
  import('./pages/CanvasHome.jsx').then((module) => ({ default: module.CanvasHome }))
);
const StripeReturn = lazy(() =>
  import('./pages/StripeReturn.jsx').then((module) => ({ default: module.StripeReturn }))
);

function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-live="polite">
      <span className="route-fallback-mark" aria-hidden="true" />
      <span>正在打开工作台</span>
    </div>
  );
}

export default function RootApp() {
  const [view] = useState(() => resolveInitialView());

  return (
    <>
      <Suspense fallback={<RouteFallback />}>
        {view === 'stripe-return' ? <StripeReturn /> : null}
        {view === 'editor' ? <App /> : null}
        {view === 'home' ? <CanvasHome /> : null}
      </Suspense>
      <GlobalLoadingOverlay />
    </>
  );
}

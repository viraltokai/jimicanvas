import { useState } from 'react';
import App from './App.jsx';
import { CanvasHome } from './pages/CanvasHome.jsx';
import { StripeReturn } from './pages/StripeReturn.jsx';
import { resolveInitialView } from './lib/routing.js';

export default function RootApp() {
  const [view] = useState(() => resolveInitialView());
  if (view === 'stripe-return') return <StripeReturn />;
  if (view === 'editor') return <App />;
  return <CanvasHome />;
}

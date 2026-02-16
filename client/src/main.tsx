import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClientGate } from './components/setup/ClientGate';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClientGate />
  </React.StrictMode>
);

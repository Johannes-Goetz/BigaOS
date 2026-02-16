import React, { useState, useEffect } from 'react';
import { ClientProvider } from '../../context/ClientContext';
import { SetupWizard } from './SetupWizard';
import App from '../../App';
import { theme } from '../../styles/theme';
import { wsService } from '../../services/websocket';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const ClientGate: React.FC = () => {
  const [clientId, setClientId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const storedId = localStorage.getItem('bigaos-client-id');
    const storedName = localStorage.getItem('bigaos-client-name');

    if (!storedId) {
      setChecking(false);
      return;
    }

    // Validate the client still exists on the server
    fetch(`${API_BASE_URL}/clients/${storedId}`)
      .then((res) => {
        if (res.ok) {
          return res.json().then((data) => {
            setClientId(storedId);
            // Refresh localStorage with server-side name
            const name = data.client?.name || storedName || 'Unknown';
            localStorage.setItem('bigaos-client-id', storedId);
            localStorage.setItem('bigaos-client-name', name);
          });
        } else {
          // Client was deleted, clear localStorage
          localStorage.removeItem('bigaos-client-id');
          localStorage.removeItem('bigaos-client-name');
        }
      })
      .catch(() => {
        // Server unreachable - trust localStorage and proceed
        setClientId(storedId);
      })
      .finally(() => setChecking(false));
  }, []);

  // Listen for remote deletion of this client
  useEffect(() => {
    if (!clientId) return;

    const handleDeleted = () => {
      localStorage.removeItem('bigaos-client-id');
      localStorage.removeItem('bigaos-client-name');
      localStorage.removeItem('bigaos-active-view');
      localStorage.removeItem('bigaos-nav-params');
      setClientId(null);
    };

    wsService.on('client_deleted', handleDeleted);
    return () => { wsService.off('client_deleted', handleDeleted); };
  }, [clientId]);

  const handleWizardComplete = (id: string, name: string) => {
    localStorage.setItem('bigaos-client-id', id);
    localStorage.setItem('bigaos-client-name', name);
    setClientId(id);
  };

  if (checking) {
    return (
      <div style={{
        width: '100vw',
        height: '100dvh',
        background: theme.colors.bgPrimary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme.colors.textPrimary,
        fontSize: theme.fontSize.lg,
      }}>
        Loading...
      </div>
    );
  }

  if (!clientId) {
    return <SetupWizard onComplete={handleWizardComplete} />;
  }

  return (
    <ClientProvider clientId={clientId}>
      <App />
    </ClientProvider>
  );
};

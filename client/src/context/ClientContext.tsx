import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { wsService } from '../services/websocket';

interface ClientContextType {
  clientId: string;
  clientName: string;
  setClientName: (name: string) => void;
}

const ClientContext = createContext<ClientContextType | null>(null);

interface ClientProviderProps {
  clientId: string;
  children: ReactNode;
}

export const ClientProvider: React.FC<ClientProviderProps> = ({ clientId, children }) => {
  const [clientName, setClientNameState] = useState<string>(
    () => localStorage.getItem('bigaos-client-name') || 'Unknown'
  );

  // Refresh localStorage on every mount to keep it alive
  useEffect(() => {
    localStorage.setItem('bigaos-client-id', clientId);
    localStorage.setItem('bigaos-client-name', clientName);
  }, [clientId, clientName]);

  const setClientName = useCallback((name: string) => {
    setClientNameState(name);
    localStorage.setItem('bigaos-client-name', name);
    wsService.emit('client_update_name', { id: clientId, name });
  }, [clientId]);

  return (
    <ClientContext.Provider value={{ clientId, clientName, setClientName }}>
      {children}
    </ClientContext.Provider>
  );
};

export const useClient = (): ClientContextType => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
};

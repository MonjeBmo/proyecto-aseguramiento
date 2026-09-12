import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { Usuario } from '../data/mockData';

interface AppContextType {
  // Sesion del vendedor
  usuario: Usuario | null;
  setUsuario: (u: Usuario | null) => void;

  // Estado de conectividad
  isOnline: boolean;

  // Trigger de sincronizacion (para que el SyncService escuche)
  syncTrigger: number;
  triggerSync: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [syncTrigger, setSyncTrigger] = useState(0);

  useEffect(() => {
    // Suscribirse a cambios de conectividad
    const unsubscribe = NetInfo.addEventListener((state) => {
      const conectado = state.isConnected === true && state.isInternetReachable !== false;
      setIsOnline(conectado);

      if (conectado) {
        // Al recuperar conexion, disparar sincronizacion automatica
        setSyncTrigger((prev) => prev + 1);
      }
    });

    return () => unsubscribe();
  }, []);

  const triggerSync = useCallback(() => {
    setSyncTrigger((prev) => prev + 1);
  }, []);

  return (
    <AppContext.Provider value={{ usuario, setUsuario, isOnline, syncTrigger, triggerSync }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider');
  return ctx;
}

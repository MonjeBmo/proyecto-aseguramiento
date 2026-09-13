import { guardarToken } from '../services/sesion';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { fechaGuatemala } from '../utils/fechaEntregas';
import { Usuario } from '../data/mockData';

interface AppContextType {
  // Sesion del usuario activo
  usuario: Usuario | null;
  setUsuario: (u: Usuario | null) => void;

  // Impersonación: admin que inició la sesión (null si no hay impersonación activa)
  adminOrigen: Usuario | null;
  setAdminOrigen: (u: Usuario | null) => void;

  fechaEntregas: string;
  setFechaEntregas: (fecha: string) => void;
  entregasRevision: number;
  actualizarEntregas: () => void;

  // Estado de conectividad
  isOnline: boolean;

  // Trigger de sincronizacion (para que el SyncService escuche)
  syncTrigger: number;
  triggerSync: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [adminOrigen, setAdminOrigen] = useState<Usuario | null>(null);
  const [fechaEntregas, setFechaEntregas] = useState(fechaGuatemala());
  const [entregasRevision, setEntregasRevision] = useState(0);
  const actualizarEntregas = useCallback(() => setEntregasRevision(n => n + 1), []);
  useEffect(() => { if (!usuario) guardarToken(null); }, [usuario]);
  useEffect(() => { setFechaEntregas(fechaGuatemala()); }, [usuario?.id]);
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
    <AppContext.Provider value={{ fechaEntregas, setFechaEntregas, entregasRevision, actualizarEntregas, usuario, setUsuario, adminOrigen, setAdminOrigen, isOnline, syncTrigger, triggerSync }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider');
  return ctx;
}

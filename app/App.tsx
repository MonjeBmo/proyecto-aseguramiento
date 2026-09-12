import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppProvider, useApp } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import { sincronizarPendientes } from './src/services/syncService';

/**
 * Componente interno que escucha el syncTrigger y ejecuta la sincronizacion
 * automatica de pedidos pendientes cuando se recupera la conexion.
 */
function SyncManager() {
  const { syncTrigger, isOnline } = useApp();

  useEffect(() => {
    if (isOnline && syncTrigger > 0) {
      sincronizarPendientes().catch((err) =>
        console.warn('[App] Error en sincronizacion automatica:', err)
      );
    }
  }, [syncTrigger, isOnline]);

  return null;
}

export default function App() {
  return (
    <AppProvider>
      <SyncManager />
      <StatusBar style="auto" />
      <AppNavigator />
    </AppProvider>
  );
}

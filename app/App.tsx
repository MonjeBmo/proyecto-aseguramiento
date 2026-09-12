import React, { useEffect, Component } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';

import { AppProvider, useApp } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import { sincronizarPendientes } from './src/services/syncService';

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: string | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#0D2137' }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 10 }}>Error de inicio</Text>
          <Text style={{ color: '#aaa', fontSize: 12 }}>{this.state.error}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

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
    <ErrorBoundary>
      <AppProvider>
        <SyncManager />
        <StatusBar style="auto" />
        <AppNavigator />
      </AppProvider>
    </ErrorBoundary>
  );
}

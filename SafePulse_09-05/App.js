import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import { inicializarNotificaciones } from './src/notificaciones';

// Paciente de prueba: Marta
const PACIENTE_ID_PRUEBA = '0iVqnPC3gL3fyGcz1u1K';

// Muestra un spinner oscuro mientras Firestore carga los datos iniciales
function Root() {
  const { appReady } = useApp();

  React.useEffect(() => {
    inicializarNotificaciones(PACIENTE_ID_PRUEBA);
  }, []);

  if (!appReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  return <AppNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}
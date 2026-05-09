import React, { useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardScreen from '../screens/DashboardScreen';
import AlertScreen from '../screens/AlertScreen';
import HistoryScreen from '../screens/HistoryScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import PatientsScreen from '../screens/PatientsScreen';
import PatientDetailScreen from '../screens/PatientDetailScreen';
import { useApp } from '../context/AppContext';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

// Componente que escucha alertas y navega usando el ref (SIN CAMBIOS)
function NavigationController() {
  const { activeAlert } = useApp();

  useEffect(() => {
    if (
      activeAlert &&
      !activeAlert.attended &&
      navigationRef.isReady()
    ) {
      navigationRef.navigate('Alert');
    }
  }, [activeAlert]);

  return null;
}

export default function AppNavigator() {
  return (
    <NavigationContainer ref={navigationRef}>
      <NavigationController />

      <Stack.Navigator
        initialRouteName="Dashboard"
        screenOptions={{
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#f8fafc',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        {/* Pantallas originales — sin cambios */}
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: 'SafePulse' }}
        />
        <Stack.Screen
          name="Alert"
          component={AlertScreen}
          options={{
            title: 'ALERTA',
            headerStyle: { backgroundColor: '#dc2626' },
            headerBackVisible: false,
          }}
        />
        <Stack.Screen
          name="History"
          component={HistoryScreen}
          options={{ title: 'Historial de Episodios' }}
        />
        <Stack.Screen
          name="EventDetail"
          component={EventDetailScreen}
          options={{ title: 'Detalle del Episodio' }}
        />
        {/* NUEVAS pantallas de pacientes */}
        <Stack.Screen
          name="Patients"
          component={PatientsScreen}
          options={{ title: 'Pacientes' }}
        />
        <Stack.Screen
          name="PatientDetail"
          component={PatientDetailScreen}
          options={{ title: 'Detalle del Paciente' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

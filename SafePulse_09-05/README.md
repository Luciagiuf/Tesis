# SafePulse — Setup

## Instalación (desde cero)

```bash
npm install
```

## Correr en Expo Go (Android)

```bash
# Opción 1 — Tunnel (recomendado, funciona en cualquier red)
npm run tunnel

# Opción 2 — LAN (solo si el celu y la PC están en la misma red)
npx expo start --clear
```

## Cambios aplicados

| Archivo | Fix |
|---|---|
| `package.json` | Expo `~54.0.0`, RN `0.76.5`, reemplazado `mqtt` → `@taoqf/react-native-mqtt` |
| `app.json` | Agregado `splash.image` y `adaptiveIcon.foregroundImage` |
| `babel.config.js` | Creado (faltaba) |
| `metro.config.js` | Creado con resolver para react-native-mqtt |
| `src/services/mqttService.js` | Import corregido |
| `src/services/firebase.js` | Eliminado `measurementId` (no soportado en RN) |
| `src/navigation/AppNavigator.js` | `NavigationController` movido dentro de `Stack.Navigator` |

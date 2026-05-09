import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

export default function AlertBanner({ alert, onPress }) {
  if (!alert) return null;

  return (
    <TouchableOpacity style={styles.banner} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.icon}>🚨</Text>
      <View style={styles.textContainer}>
        <Text style={styles.title}>ALERTA ACTIVA</Text>
        <Text style={styles.sub}>Toca para ver detalle</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#dc2626',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#dc2626',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: {
    fontSize: 28,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  sub: {
    color: '#fecaca',
    fontSize: 12,
    marginTop: 2,
  },
  arrow: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
});
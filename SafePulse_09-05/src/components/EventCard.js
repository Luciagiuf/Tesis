import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { formatDate, formatTime, formatDuration, intensityLabel, intensityColor } from '../utils/dateHelpers';

export default function EventCard({ event, onPress }) {
  const color = intensityColor(event.intensity);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.accent, { backgroundColor: color }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.date}>{formatDate(event.startTime)}</Text>
          <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
            <Text style={[styles.badgeText, { color }]}>{intensityLabel(event.intensity)}</Text>
          </View>
        </View>
        <Text style={styles.time}>
          {formatTime(event.startTime)} → {formatTime(event.endTime)}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.meta}>⏱ {formatDuration(event.durationSeconds)}</Text>
          <Text style={styles.meta}>📊 RMS {event.intensity?.toFixed(2)}</Text>
          <Text style={styles.meta}>📈 {event.peakCount} picos</Text>
        </View>
        <Text style={styles.device}>{event.deviceId}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accent: {
    width: 5,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  date: {
    color: '#f1f5f9',
    fontWeight: 'bold',
    fontSize: 15,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  time: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  meta: {
    color: '#64748b',
    fontSize: 12,
  },
  device: {
    color: '#475569',
    fontSize: 11,
  },
  arrow: {
    color: '#475569',
    fontSize: 24,
    alignSelf: 'center',
    paddingRight: 12,
  },
});
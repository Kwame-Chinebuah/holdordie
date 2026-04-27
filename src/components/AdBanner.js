import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../data/theme';

// ─────────────────────────────────────────────────────────────
// AdBanner — swap this View for a real AdMob BannerAd once you
// install expo-ads-admob or react-native-google-mobile-ads.
// ─────────────────────────────────────────────────────────────
export default function AdBanner() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>AD BANNER — AdMob goes here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 50,
    backgroundColor: '#0a0a20',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
});

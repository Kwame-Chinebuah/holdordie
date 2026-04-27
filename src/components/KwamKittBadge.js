import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../data/theme';

export default function KwamKittBadge() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>KwamKitt</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  text: {
    color: COLORS.accent,
    fontSize: 9,
    fontFamily: 'monospace',
    letterSpacing: 3,
    textTransform: 'uppercase',
    opacity: 0.4,
  },
});

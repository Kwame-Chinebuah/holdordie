import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../data/theme';

// ─────────────────────────────────────────────────────────────
// AdBanner — Google AdMob Banner
// App ID:     ca-app-pub-8920454653234729~3332226609
// Ad Unit ID: ca-app-pub-8920454653234729/8392981598
// ─────────────────────────────────────────────────────────────

let BannerAd, BannerAdSize, TestIds;
try {
  const admob = require('react-native-google-mobile-ads');
  BannerAd = admob.BannerAd;
  BannerAdSize = admob.BannerAdSize;
  TestIds = admob.TestIds;
} catch (e) {
  BannerAd = null;
}

const BANNER_ID = __DEV__
  ? 'ca-app-pub-3940256099942544/6300978111' // Google test banner ID
  : 'ca-app-pub-8920454653234729/8392981598'; // Your real ID

export default function AdBanner() {
  if (!BannerAd) {
    // react-native-google-mobile-ads not installed yet — show placeholder
    return <View style={styles.placeholder} />;
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={BANNER_ID}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdFailedToLoad={(error) => console.log('Ad failed:', error)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
    minHeight: 50,
  },
  placeholder: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.bg,
  },
});

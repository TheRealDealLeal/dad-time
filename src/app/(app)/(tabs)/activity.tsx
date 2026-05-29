import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { Colors, Typography, Spacing } from '../../../constants/theme';

export default function ActivityScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
      </View>
      <View style={styles.center}>
        <SymbolView
          // @ts-ignore
          name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
          size={56}
          tintColor={Colors.primaryLight}
        />
        <Text style={styles.comingTitle}>Notifications coming soon</Text>
        <Text style={styles.comingSub}>Get pinged when someone votes or the crew locks in a time.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
    backgroundColor: Colors.primary,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: Colors.white, letterSpacing: -0.5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  comingTitle: { ...Typography.titleMd, color: Colors.textDim },
  comingSub: { ...Typography.bodyMd, color: Colors.textFaint, textAlign: 'center' },
});

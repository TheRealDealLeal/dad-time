import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useAuth } from '../../../context/AuthContext';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();

  const initials = session?.user?.email
    ? session.user.email.slice(0, 2).toUpperCase()
    : 'DA';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.displayName}>
            {session?.user?.user_metadata?.full_name ?? 'Dad'}
          </Text>
          <Text style={styles.email}>{session?.user?.email ?? 'Anonymous'}</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Sign out */}
        <Pressable
          style={({ pressed }) => [styles.signOutRow, pressed && { opacity: 0.6 }]}
          onPress={signOut}
          accessibilityRole="button"
        >
          <SymbolView
            // @ts-ignore
            name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }}
            size={20}
            tintColor={Colors.no}
          />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
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

  content: { flex: 1, padding: Spacing.md, gap: Spacing.md },

  avatarWrap: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    ...Shadow.md,
  },
  avatarInitials: { fontSize: 32, fontWeight: '900', color: Colors.white, letterSpacing: 1 },
  displayName: { ...Typography.titleLg, color: Colors.text },
  email: { ...Typography.bodyMd, color: Colors.textFaint },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginHorizontal: -Spacing.md },

  signOutRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.border,
    ...Shadow.sm,
  },
  signOutText: { ...Typography.titleSm, color: Colors.no },
});

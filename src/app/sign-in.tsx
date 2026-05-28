import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  Platform, SafeAreaView,
} from 'react-native';
import { Redirect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';

WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
  const { session } = useAuth();
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);

  if (session) return <Redirect href="/(app)" />;

  async function signInWith(provider: 'google' | 'apple') {
    setLoading(provider);
    try {
      const redirectUrl = makeRedirectUri({ scheme: 'dadtime', path: 'auth/callback' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'success') {
          await supabase.auth.exchangeCodeForSession(result.url);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Hero */}
        <View style={styles.hero}>
          {/* Label badge */}
          <View style={styles.labelBorder}>
            <View style={styles.labelInner}>
              <Text style={styles.labelTopText}>EST. 2025</Text>

              <View style={styles.mugWrap}>
                <Text style={styles.mug}>🍺</Text>
              </View>

              <Text style={styles.appName}>DAD TIME</Text>
              <View style={styles.dividerLine} />
              <Text style={styles.tagline}>GET THE CREW TOGETHER</Text>
            </View>
          </View>

          <Text style={styles.sub}>
            Schedule hangouts, see who's in,{'\n'}and actually make it happen.
          </Text>
        </View>

        {/* Activity icons row */}
        <View style={styles.activitiesRow}>
          {['🏌️', '🎮', '🎯', '🏈', '🎸', '🍕'].map((emoji, i) => (
            <View key={i} style={styles.activityChip}>
              <Text style={styles.activityEmoji}>{emoji}</Text>
            </View>
          ))}
        </View>

        {/* Auth buttons */}
        <View style={styles.authSection}>
          <Pressable
            style={({ pressed }) => [styles.authBtn, pressed && styles.pressed]}
            onPress={() => signInWith('google')}
            disabled={!!loading}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
          >
            {loading === 'google' ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <>
                <Text style={styles.authBtnIcon}>G</Text>
                <Text style={styles.authBtnLabel}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          {Platform.OS === 'ios' && (
            <Pressable
              style={({ pressed }) => [styles.authBtn, styles.appleBtn, pressed && styles.pressed]}
              onPress={() => signInWith('apple')}
              disabled={!!loading}
              accessibilityRole="button"
              accessibilityLabel="Continue with Apple"
            >
              {loading === 'apple' ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Text style={[styles.authBtnIcon, styles.appleBtnText]}></Text>
                  <Text style={[styles.authBtnLabel, styles.appleBtnText]}>Continue with Apple</Text>
                </>
              )}
            </Pressable>
          )}

          <Text style={styles.disclaimer}>
            By continuing, you agree to be a good hang.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'space-between',
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },

  // Craft label design
  labelBorder: {
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: Radius.xl,
    padding: 6,
  },
  labelInner: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
    minWidth: 260,
  },
  labelTopText: {
    ...Typography.label,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 3,
    fontSize: 10,
  },
  mugWrap: {
    marginVertical: Spacing.sm,
  },
  mug: {
    fontSize: 64,
  },
  appName: {
    fontSize: 46,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 4,
    lineHeight: 50,
  },
  dividerLine: {
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    width: 160,
    marginVertical: Spacing.xs,
  },
  tagline: {
    ...Typography.label,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 2.5,
    fontSize: 10,
  },

  sub: {
    ...Typography.bodyMd,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Activity row
  activitiesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  activityChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityEmoji: {
    fontSize: 20,
  },

  // Auth buttons
  authSection: {
    gap: Spacing.sm,
  },
  authBtn: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    minHeight: 54,
    ...Shadow.md,
  },
  appleBtn: {
    backgroundColor: Colors.black,
  },
  authBtnIcon: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
  },
  authBtnLabel: {
    ...Typography.titleSm,
    color: Colors.text,
    letterSpacing: 0.2,
  },
  appleBtnText: {
    color: Colors.white,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  disclaimer: {
    ...Typography.bodySm,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});

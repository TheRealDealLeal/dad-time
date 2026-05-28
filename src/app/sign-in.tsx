import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  Platform, SafeAreaView, Image,
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
          <Text style={styles.logo}>🍺</Text>
          <Text style={styles.appName}>Dad Time</Text>
          <Text style={styles.tagline}>Get the crew together.</Text>
          <Text style={styles.sub}>
            Schedule hangouts, see who's in, and actually make it happen.
          </Text>
        </View>

        {/* Auth buttons */}
        <View style={styles.authSection}>
          <Pressable
            style={({ pressed }) => [styles.authBtn, pressed && styles.pressed]}
            onPress={() => signInWith('google')}
            disabled={!!loading}
          >
            {loading === 'google' ? (
              <ActivityIndicator color={Colors.text} size="small" />
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
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  logo: {
    fontSize: 72,
    marginBottom: Spacing.md,
  },
  appName: {
    fontSize: 42,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -1,
  },
  tagline: {
    ...Typography.titleLg,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  sub: {
    ...Typography.bodyMd,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    maxWidth: 280,
    marginTop: Spacing.sm,
  },
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
    ...Shadow.sm,
  },
  appleBtn: {
    backgroundColor: Colors.black,
  },
  authBtnIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  authBtnLabel: {
    ...Typography.titleMd,
    color: Colors.text,
  },
  appleBtnText: {
    color: Colors.white,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  disclaimer: {
    ...Typography.bodySm,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});

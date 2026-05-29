import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  Platform, SafeAreaView, TextInput, KeyboardAvoidingView, ScrollView,
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
  const [loading, setLoading] = useState<'google' | 'apple' | 'dev-in' | 'dev-up' | null>(null);
  const [devEmail, setDevEmail] = useState('');
  const [devPassword, setDevPassword] = useState('');
  const [devError, setDevError] = useState('');
  const [devExpanded, setDevExpanded] = useState(false);

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

  async function devSignIn() {
    if (!devEmail.trim() || !devPassword.trim()) { setDevError('Enter email and password.'); return; }
    setDevError('');
    setLoading('dev-in');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: devEmail.trim(),
        password: devPassword.trim(),
      });
      if (error) throw error;
    } catch (e: any) {
      setDevError(e?.message ?? 'Sign in failed.');
    } finally {
      setLoading(null);
    }
  }

  async function devSignUp() {
    if (!devEmail.trim() || !devPassword.trim()) { setDevError('Enter email and password.'); return; }
    setDevError('');
    setLoading('dev-up');
    try {
      const { error } = await supabase.auth.signUp({
        email: devEmail.trim(),
        password: devPassword.trim(),
      });
      if (error) throw error;
    } catch (e: any) {
      setDevError(e?.message ?? 'Sign up failed.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* Hero */}
          <View style={styles.hero}>
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

            {/* Dev-only email/password login */}
            {__DEV__ && (
              <View style={styles.devSection}>
                <Pressable
                  onPress={() => setDevExpanded(e => !e)}
                  style={styles.devToggle}
                  accessibilityRole="button"
                >
                  <Text style={styles.devToggleText}>
                    {devExpanded ? '▲ Dev Login' : '▼ Dev Login'}
                  </Text>
                </Pressable>

                {devExpanded && (
                  <View style={styles.devForm}>
                    <TextInput
                      style={styles.devInput}
                      placeholder="test@example.com"
                      placeholderTextColor={Colors.textFaint}
                      value={devEmail}
                      onChangeText={setDevEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      accessibilityLabel="Dev login email"
                    />
                    <TextInput
                      style={styles.devInput}
                      placeholder="password"
                      placeholderTextColor={Colors.textFaint}
                      value={devPassword}
                      onChangeText={setDevPassword}
                      secureTextEntry
                      accessibilityLabel="Dev login password"
                    />
                    {devError ? (
                      <Text style={styles.devError}>{devError}</Text>
                    ) : null}
                    <View style={styles.devBtnRow}>
                      <Pressable
                        style={({ pressed }) => [styles.devBtn, pressed && { opacity: 0.75 }]}
                        onPress={devSignIn}
                        disabled={!!loading}
                        accessibilityRole="button"
                      >
                        {loading === 'dev-in' ? (
                          <ActivityIndicator color={Colors.white} size="small" />
                        ) : (
                          <Text style={styles.devBtnText}>Sign In</Text>
                        )}
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [styles.devBtn, pressed && { opacity: 0.75 }]}
                        onPress={devSignUp}
                        disabled={!!loading}
                        accessibilityRole="button"
                      >
                        {loading === 'dev-up' ? (
                          <ActivityIndicator color={Colors.white} size="small" />
                        ) : (
                          <Text style={styles.devBtnText}>Sign Up</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  container: {
    flexGrow: 1,
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

  // Dev login
  devSection: {
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: Spacing.md,
  },
  devToggle: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  devToggleText: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
  },
  devForm: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  devInput: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    ...Typography.bodyMd,
    color: Colors.white,
    minHeight: 48,
  },
  devError: {
    ...Typography.bodySm,
    color: 'rgba(255,160,160,1)',
    textAlign: 'center',
  },
  devBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  devBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingVertical: Spacing.sm + 4,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  devBtnText: {
    ...Typography.titleSm,
    color: Colors.white,
  },
});

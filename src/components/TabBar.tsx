import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';

// Exported so screens can add matching bottom padding to their scroll content
export const TAB_BAR_CONTENT_HEIGHT = Platform.OS === 'android' ? 80 : 49;

const ACTIVE_COLOR = Colors.primary;
const INACTIVE_COLOR = Platform.OS === 'android' ? Colors.textFaint : 'rgba(60,60,67,0.3)';
const IS_ANDROID = Platform.OS === 'android';

const TABS = [
  {
    name: 'index',
    label: 'Home',
    icon:   { ios: 'house',       android: 'home',          web: 'home' },
    iconOn: { ios: 'house.fill',  android: 'home',          web: 'home' },
  },
  {
    name: 'friends',
    label: 'Friends',
    icon:   { ios: 'person.2',       android: 'group',     web: 'group' },
    iconOn: { ios: 'person.2.fill',  android: 'group',     web: 'group' },
  },
  {
    name: 'activity',
    label: 'Activity',
    icon:   { ios: 'bell',       android: 'notifications', web: 'notifications' },
    iconOn: { ios: 'bell.fill',  android: 'notifications', web: 'notifications' },
  },
  {
    name: 'profile',
    label: 'Profile',
    icon:   { ios: 'person.crop.circle',       android: 'account_circle', web: 'person' },
    iconOn: { ios: 'person.crop.circle.fill',  android: 'account_circle', web: 'person' },
  },
] as const;

type TabBarState = {
  index: number;
  routes: { key: string; name: string }[];
};
type TabBarNavigation = {
  navigate: (name: string) => void;
  emit: (e: { type: string; target: string; canPreventDefault: boolean }) => { defaultPrevented: boolean };
};

export default function TabBar({ state, navigation }: { state: TabBarState; navigation: TabBarNavigation }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  function goTo(index: number) {
    const event = navigation.emit({ type: 'tabPress', target: state.routes[index].key, canPreventDefault: true });
    if (state.index !== index && !event.defaultPrevented) {
      navigation.navigate(state.routes[index].name);
    }
  }

  return (
    <View style={[styles.wrap, IS_ANDROID ? styles.wrapAndroid : styles.wrapIOS, { paddingBottom: insets.bottom }]}>
      <View style={styles.row}>
        {/* Left two tabs: Home + Friends */}
        {TABS.slice(0, 2).map((tab, i) => (
          <TabButton key={tab.name} tab={tab} isFocused={state.index === i} onPress={() => goTo(i)} />
        ))}

        {/* Center FAB — opens create modal, not a tab */}
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={() => router.push('/(app)/create')}
          accessibilityRole="button"
          accessibilityLabel="Start a hangout"
        >
          <SymbolView
            // @ts-ignore — expo-symbols object name form
            name={{ ios: 'plus', android: 'add', web: 'add' }}
            size={26}
            tintColor={Colors.white}
          />
        </Pressable>

        {/* Right two tabs: Activity + Profile */}
        {TABS.slice(2).map((tab, i) => (
          <TabButton key={tab.name} tab={tab} isFocused={state.index === i + 2} onPress={() => goTo(i + 2)} />
        ))}
      </View>
    </View>
  );
}

type Tab = (typeof TABS)[number];

function TabButton({ tab, isFocused, onPress }: { tab: Tab; isFocused: boolean; onPress: () => void }) {
  const color = isFocused ? ACTIVE_COLOR : INACTIVE_COLOR;
  const sym = isFocused ? tab.iconOn : tab.icon;

  return (
    <Pressable
      style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
    >
      {IS_ANDROID ? (
        // Material 3: pill indicator wraps only the icon
        <View style={[styles.pill, isFocused && styles.pillActive]}>
          <SymbolView
            // @ts-ignore
            name={sym}
            size={24}
            tintColor={color}
          />
        </View>
      ) : (
        <SymbolView
          // @ts-ignore
          name={sym}
          size={25}
          tintColor={color}
        />
      )}
      <Text style={[styles.label, { color }]}>{tab.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surface,
  },
  wrapIOS: {
    backgroundColor: 'rgba(245,242,236,0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  wrapAndroid: {
    elevation: 8,
    backgroundColor: Colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TAB_BAR_CONTENT_HEIGHT,
    paddingHorizontal: 4,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: IS_ANDROID ? 0 : 3,
    paddingVertical: 4,
  },
  tabPressed: { opacity: 0.6 },

  // Android: M3 pill wraps the icon only
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  pillActive: {
    backgroundColor: Colors.primaryLight,
  },

  label: {
    fontSize: IS_ANDROID ? 12 : 10,
    fontWeight: '500',
    letterSpacing: IS_ANDROID ? 0 : 0.1,
  },

  // Center FAB
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
});

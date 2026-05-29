import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../../constants/theme';

export default function AppLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!session) return <Redirect href="/sign-in" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" options={{ presentation: 'modal' }} />
      <Stack.Screen name="hangout/[id]" />
      <Stack.Screen name="hangout/add-option" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

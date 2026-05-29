import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// expo-notifications removed Android push support from Expo Go in SDK 53.
// Dynamically import it only when running in a real dev/prod build.
const isExpoGo = Constants.executionEnvironment === 'storeClient';

if (!isExpoGo) {
  import('expo-notifications').then(({ setNotificationHandler }) => {
    setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (isExpoGo || !Device.isDevice) return null;

  const Notifications = await import('expo-notifications');

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

export async function savePushToken(userId: string): Promise<void> {
  const token = await registerForPushNotifications();
  if (!token) return;
  await supabase
    .from('users')
    .update({ push_token: token })
    .eq('id', userId);
}

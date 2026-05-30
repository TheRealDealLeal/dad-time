import React, { useEffect } from 'react';
import { Slot, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { AuthProvider } from '../context/AuthContext';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    if (isExpoGo) return;

    let responseSub: { remove: () => void } | undefined;

    import('expo-notifications').then(Notifications => {
      // Tapped while app is running or backgrounded
      responseSub = Notifications.addNotificationResponseReceivedListener(response => {
        const hangoutId = response.notification.request.content.data?.hangoutId;
        if (hangoutId) {
          router.push(`/(app)/hangout/${hangoutId}` as any);
        }
      });

      // App cold-started by tapping a notification
      Notifications.getLastNotificationResponseAsync().then(response => {
        if (!response) return;
        const hangoutId = response.notification.request.content.data?.hangoutId;
        if (hangoutId) {
          // Brief delay so the navigation stack has time to mount
          setTimeout(() => router.push(`/(app)/hangout/${hangoutId}` as any), 300);
        }
      });
    });

    return () => { responseSub?.remove(); };
  }, []);

  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
}

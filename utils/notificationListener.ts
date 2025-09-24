import * as Notification from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { AppState } from "react-native";

export function useNotificationListener() {
  const router = useRouter();

  useEffect(() => {
    // Set up background handling
    Notification.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data as {
          medicationId?: string;
          showAlarmScreen?: boolean;
        } | null;

        // In background, we'll show the notification AND open the app
        const isBackground = AppState.currentState !== 'active';
        
        if (data?.showAlarmScreen) {
          // If in background, we need to wake up the app
          if (isBackground) {
            // Schedule an immediate notification to wake up the app
            await Notification.scheduleNotificationAsync({
              content: {
                title: notification.request.content.title || 'Medication Reminder',
                body: notification.request.content.body,
                data: {
                  medicationId: data?.medicationId,
                  showAlarmScreen: true,
                  openOnBackground: true,
                },
                sound: 'default',
              },
              trigger: null, // null trigger means show immediately
            });
          } else {
            // In foreground, just navigate
            router.push({
              pathname: "/home/alarm",
              params: { medicationId: data.medicationId }
            } as any);
          }
        }

        return {
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPresent: true,
          shouldShowAlert: true,
        };
      },
    });

    // Handle notification received while app is in foreground
    const foregroundSubscription = Notification.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data as {
        medicationId?: string;
        showAlarmScreen?: boolean;
      } | null;

      if (data?.showAlarmScreen && AppState.currentState === 'active') {
        router.push({
          pathname: "/home/alarm",
          params: { medicationId: data.medicationId }
        } as any);
      }
    });

    // Handle notification response (when user taps notification or action button)
    const responseSubscription = Notification.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as {
        medicationId?: string;
        showAlarmScreen?: boolean;
        openOnBackground?: boolean;
      } | null;

      if (data?.showAlarmScreen || data?.openOnBackground) {
        router.push({
          pathname: "/home/alarm",
          params: { medicationId: data.medicationId }
        } as any);
      }
    });

    // Handle app state changes
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        // Check if we have any pending notifications to handle
        Notification.getPresentedNotificationsAsync().then(notifications => {
          notifications.forEach(notification => {
            const data = notification.request.content.data as {
              medicationId?: string;
              showAlarmScreen?: boolean;
              openOnBackground?: boolean;
            } | null;

            if (data?.openOnBackground) {
              router.push({
                pathname: "/home/alarm",
                params: { medicationId: data.medicationId }
              } as any);
            }
          });
        });
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
      subscription.remove();
    };
  }, [router]);
}
import * as Notification from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { AppState } from "react-native";

export function useNotificationListener() {
  const router = useRouter();

  useEffect(() => {
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

    // Handle notification response (when user taps notification)
    const responseSubscription = Notification.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as {
        medicationId?: string;
        showAlarmScreen?: boolean;
      } | null;

      if (data?.showAlarmScreen) {
        router.push({
          pathname: "/home/alarm",
          params: { medicationId: data.medicationId }
        } as any);
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, [router]);
}
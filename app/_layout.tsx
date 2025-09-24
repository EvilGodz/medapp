import { useNotificationListener } from "@/utils/notificationListener";
import { Stack } from "expo-router";
import React from 'react';
import { StatusBar } from "react-native";

export default function RootLayout() {
  // Set up notification listener for deep linking
  useNotificationListener();
  return (
    <>
      <StatusBar barStyle={"light-content"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'white' },
          animation: "slide_from_right",
          header: () => null,
          navigationBarHidden: true
        }}>


        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </>
  )
}

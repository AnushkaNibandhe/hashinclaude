import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import authService from "../services/authService";

export default function RootLayout() {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    authService.isLoggedIn().then((loggedIn) => {
      if (!loggedIn) {
        router.replace("/login");
      }
      setChecked(true);
    });
  }, []);

  if (!checked) return null;

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      <StatusBar style="auto" />
    </>
  );
}

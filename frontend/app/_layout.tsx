import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, Platform } from "react-native";
import { useFonts } from "expo-font";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider, useAuth } from "@/src/auth";
import { api } from "@/src/api";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

function AuthGate() {
  const { user, loading, setSession, refresh } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Handle web session_id in URL (from OAuth redirect)
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    const match =
      hash.match(/session_id=([^&]+)/) || search.match(/session_id=([^&]+)/);
    if (!match) return;
    const sessionId = decodeURIComponent(match[1]);
    (async () => {
      try {
        const res = await api.createSession(sessionId);
        await setSession(res.session_token, res.user);
        window.history.replaceState(null, "", window.location.pathname);
      } catch (e) {
        console.log("session exchange failed", e);
      }
    })();
  }, [setSession]);

  useEffect(() => {
    if (loading) return;
    const inAuthScreen = segments[0] === "login";
    const inSharedScreen = segments[0] === "shared";
    if (!user && !inAuthScreen && !inSharedScreen) {
      router.replace("/login");
    } else if (user && inAuthScreen) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments, router]);

  return null;
}

export default function RootLayout() {
  const [iconsLoaded, iconsError] = useIconFonts();
  const [fontsLoaded, fontsError] = useFonts({
    PlusJakartaSans: require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
    SpaceGrotesk: require("../assets/fonts/SpaceGrotesk-Regular.ttf"),
  });

  const ready = (iconsLoaded || iconsError) && (fontsLoaded || fontsError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AuthGate />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="shared/[token]" />
            <Stack.Screen
              name="transaction-editor"
              options={{ presentation: "modal", animation: "slide_from_bottom" }}
            />
            <Stack.Screen
              name="transfer-editor"
              options={{ presentation: "modal", animation: "slide_from_bottom" }}
            />
            <Stack.Screen
              name="account-editor"
              options={{ presentation: "modal", animation: "slide_from_bottom" }}
            />
            <Stack.Screen
              name="account-detail"
              options={{ presentation: "card", animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="category-editor"
              options={{ presentation: "modal", animation: "slide_from_bottom" }}
            />
            <Stack.Screen
              name="budgets"
              options={{ presentation: "card", animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="charts"
              options={{ presentation: "card", animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="settings"
              options={{ presentation: "card", animation: "slide_from_right" }}
            />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

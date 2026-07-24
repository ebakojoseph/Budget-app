import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";

const HERO = "https://images.pexels.com/photos/4046791/pexels-photo-4046791.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function Login() {
  const { setSession } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setError(null);
    setBusy(true);
    try {
      const redirectUrl =
        Platform.OS === "web"
          ? window.location.origin + "/"
          : Linking.createURL("");
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

      if (Platform.OS === "web") {
        window.location.href = authUrl;
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      if (result.type !== "success" || !result.url) {
        setBusy(false);
        return;
      }
      const url = result.url;
      const match = url.match(/session_id=([^&#]+)/);
      if (!match) {
        setError("No session in redirect");
        setBusy(false);
        return;
      }
      const sessionId = decodeURIComponent(match[1]);
      const res = await api.createSession(sessionId);
      await setSession(res.session_token, res.user);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <Image source={HERO} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.top}>
          <View style={styles.logo}>
            <Ionicons name="leaf-outline" size={24} color={theme.colors.onSurfaceInverse} />
          </View>
          <Text style={styles.brand}>BudgetTracker</Text>
        </View>

        <View style={styles.bottom}>
          <Text style={styles.title}>Money made calm.</Text>
          <Text style={styles.subtitle}>
            Track budgets, accounts, and investments in one place. Sync across devices with Google.
          </Text>

          <Pressable
            testID="google-signin-btn"
            onPress={signIn}
            disabled={busy}
            style={[styles.btn, busy && { opacity: 0.6 }]}
          >
            {busy ? (
              <ActivityIndicator color={theme.colors.brandPrimary} />
            ) : (
              <>
                <Ionicons name="logo-google" size={18} color={theme.colors.brandPrimary} />
                <Text style={styles.btnText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          {error && <Text style={styles.error}>{error}</Text>}

          <Text style={styles.terms}>
            By continuing you agree to sync your data across devices tied to your Google account.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surfaceInverse },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(26,28,26,0.65)" },
  safe: { flex: 1, padding: theme.spacing.xl, justifyContent: "space-between" },
  top: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontFamily: theme.font.display,
    fontSize: 16,
    color: theme.colors.onSurfaceInverse,
  },

  bottom: {},
  title: {
    fontFamily: theme.font.display,
    fontSize: 34,
    color: theme.colors.onSurfaceInverse,
    lineHeight: 40,
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    fontFamily: theme.font.text,
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: theme.colors.onSurfaceInverse,
    paddingVertical: 16,
    borderRadius: theme.radius.pill,
  },
  btnText: {
    color: theme.colors.brandPrimary,
    fontFamily: theme.font.text,
    fontSize: 15,
  },
  error: {
    marginTop: theme.spacing.md,
    color: "#FDB4A8",
    fontFamily: theme.font.text,
    fontSize: 13,
    textAlign: "center",
  },
  terms: {
    marginTop: theme.spacing.lg,
    color: "rgba(255,255,255,0.55)",
    fontFamily: theme.font.text,
    fontSize: 12,
    textAlign: "center",
  },
});

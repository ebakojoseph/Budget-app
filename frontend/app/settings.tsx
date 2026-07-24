import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { theme } from "@/src/theme";
import { useAuth } from "@/src/auth";

export default function Settings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="settings-back" onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.profileCard}>
          {user?.picture ? (
            <Image source={{ uri: user.picture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={26} color={theme.colors.onBrandPrimary} />
            </View>
          )}
          <Text style={styles.name}>{user?.name || "User"}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <View style={styles.list}>
          <Row
            icon="folder-outline"
            label="Saved budgets"
            onPress={() => router.push("/budgets")}
            testID="settings-budgets"
          />
          <Row
            icon="bar-chart-outline"
            label="Charts & insights"
            onPress={() => router.push("/charts")}
            testID="settings-charts"
          />
        </View>

        <Pressable
          testID="settings-logout"
          onPress={async () => {
            await logout();
            router.replace("/login");
          }}
          style={styles.logout}
        >
          <Ionicons name="log-out-outline" size={18} color={theme.colors.error} />
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Row({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={theme.colors.brandPrimary} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontFamily: theme.font.display, fontSize: 16, color: theme.colors.onSurface },

  body: { flex: 1, padding: theme.spacing.lg, gap: theme.spacing.lg },
  profileCard: {
    alignItems: "center",
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: theme.spacing.md,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontFamily: theme.font.display, fontSize: 18, color: theme.colors.onSurface },
  email: {
    fontFamily: theme.font.text,
    fontSize: 13,
    color: theme.colors.onSurfaceTertiary,
    marginTop: 2,
  },

  list: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    flex: 1,
    fontFamily: theme.font.text,
    fontSize: 14,
    color: theme.colors.onSurface,
  },

  logout: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    padding: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.error,
  },
  logoutText: {
    color: theme.colors.error,
    fontFamily: theme.font.text,
    fontSize: 14,
  },
});

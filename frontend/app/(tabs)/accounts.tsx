import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { theme } from "@/src/theme";
import { api, Account, fmtMoney } from "@/src/api";

const GROUP_ORDER = ["Cash", "Registered", "Investment", "Crypto", "Other"];
const GROUP_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  Cash: "cash-outline",
  Registered: "shield-checkmark-outline",
  Investment: "trending-up-outline",
  Crypto: "logo-bitcoin",
  Other: "layers-outline",
};

export default function AccountsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const a = await api.listAccounts();
      setAccounts(a);
    } catch (e) {
      console.log("accounts load error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const netWorth = accounts.reduce((s, a) => s + (a.balance || 0), 0);

  const groups: Record<string, Account[]> = {};
  for (const a of accounts) {
    (groups[a.group] = groups[a.group] || []).push(a);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={theme.colors.brandPrimary}
          />
        }
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.title}>Accounts</Text>
          <View style={styles.netCard}>
            <Text style={styles.netLabel}>Net worth</Text>
            <Text style={styles.netValue} testID="net-worth">
              {fmtMoney(netWorth)}
            </Text>
            <Text style={styles.netHint}>{accounts.length} accounts</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 30 }} color={theme.colors.brandPrimary} />
        ) : (
          GROUP_ORDER.filter((g) => groups[g] && groups[g].length > 0).map((g) => {
            const list = groups[g];
            const groupTotal = list.reduce((s, a) => s + a.balance, 0);
            return (
              <View key={g} style={styles.groupBlock}>
                <View style={styles.groupHeader}>
                  <View style={styles.groupHeaderLeft}>
                    <View style={styles.groupIcon}>
                      <Ionicons name={GROUP_ICON[g] || "wallet-outline"} size={16} color={theme.colors.brandPrimary} />
                    </View>
                    <Text style={styles.groupName}>{g}</Text>
                  </View>
                  <Text style={styles.groupTotal}>{fmtMoney(groupTotal)}</Text>
                </View>
                {list.map((a) => {
                  const change = a.balance - (a.brought_forward || 0);
                  return (
                    <Pressable
                      key={a.id}
                      testID={`account-row-${a.id}`}
                      onPress={() =>
                        router.push({
                          pathname: "/account-editor",
                          params: {
                            id: a.id,
                            name: a.name,
                            group: a.group,
                            balance: String(a.balance),
                          },
                        })
                      }
                      style={styles.accCard}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.accName} numberOfLines={1}>
                          {a.name}
                        </Text>
                        <Text style={styles.accSub}>
                          Start {fmtMoney(a.brought_forward || 0)}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.accBalance}>{fmtMoney(a.balance)}</Text>
                        <Text
                          style={[
                            styles.accChange,
                            {
                              color:
                                change >= 0 ? theme.colors.success : theme.colors.error,
                            },
                          ]}
                        >
                          {change >= 0 ? "+" : ""}
                          {fmtMoney(change)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>

      <Pressable
        testID="add-account-fab"
        style={[styles.fab, { bottom: insets.bottom + 84 }]}
        onPress={() => router.push("/account-editor")}
      >
        <Ionicons name="add" size={28} color={theme.colors.onBrandPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  title: {
    fontFamily: theme.font.display,
    fontSize: 24,
    color: theme.colors.onSurface,
  },
  netCard: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surfaceInverse,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  netLabel: {
    fontFamily: theme.font.text,
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  netValue: {
    fontFamily: theme.font.numeric,
    color: theme.colors.onSurfaceInverse,
    fontSize: 32,
    marginTop: 4,
  },
  netHint: {
    fontFamily: theme.font.text,
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 6,
  },

  groupBlock: { marginBottom: theme.spacing.lg },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  groupHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  groupIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: theme.colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  groupName: {
    fontFamily: theme.font.display,
    color: theme.colors.onSurface,
    fontSize: 15,
  },
  groupTotal: {
    fontFamily: theme.font.numeric,
    fontSize: 13,
    color: theme.colors.onSurfaceTertiary,
  },
  accCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceSecondary,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  accName: {
    fontFamily: theme.font.text,
    fontSize: 14,
    color: theme.colors.onSurface,
  },
  accSub: {
    fontFamily: theme.font.text,
    fontSize: 11,
    color: theme.colors.onSurfaceTertiary,
    marginTop: 2,
  },
  accBalance: {
    fontFamily: theme.font.numeric,
    fontSize: 15,
    color: theme.colors.onSurface,
  },
  accChange: {
    fontFamily: theme.font.numeric,
    fontSize: 11,
    marginTop: 2,
  },

  fab: {
    position: "absolute",
    right: theme.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});

import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Modal,
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
  const [showFabMenu, setShowFabMenu] = useState(false);

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
  const totalChange = accounts.reduce(
    (s, a) => s + (a.balance - (a.brought_forward || 0)),
    0,
  );

  const groups: Record<string, Account[]> = {};
  for (const a of accounts) {
    (groups[a.group] = groups[a.group] || []).push(a);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
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
            <View style={styles.netRow}>
              <Text style={styles.netHint}>{accounts.length} accounts</Text>
              <Text
                style={[
                  styles.netChange,
                  { color: totalChange >= 0 ? "#B9E4C9" : "#F0B9AF" },
                ]}
              >
                {totalChange >= 0 ? "+" : ""}
                {fmtMoney(totalChange)} this period
              </Text>
            </View>
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
                          pathname: "/account-detail",
                          params: { id: a.id },
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

      {/* Multi-option FAB */}
      <Pressable
        testID="accounts-fab"
        style={[styles.fab, { bottom: insets.bottom + 84 }]}
        onPress={() => setShowFabMenu(true)}
      >
        <Ionicons name="add" size={28} color={theme.colors.onBrandPrimary} />
      </Pressable>

      <Modal
        transparent
        visible={showFabMenu}
        animationType="fade"
        onRequestClose={() => setShowFabMenu(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setShowFabMenu(false)}>
          <View style={[styles.menuCard, { bottom: insets.bottom + 150 }]}>
            <MenuItem
              testID="menu-add-account"
              icon="wallet-outline"
              label="Add account"
              onPress={() => {
                setShowFabMenu(false);
                router.push("/account-editor");
              }}
            />
            <MenuItem
              testID="menu-add-tx"
              icon="add-circle-outline"
              label="Add transaction"
              onPress={() => {
                setShowFabMenu(false);
                router.push("/transaction-editor");
              }}
            />
            <MenuItem
              testID="menu-transfer"
              icon="swap-horizontal-outline"
              label="Transfer between accounts"
              onPress={() => {
                setShowFabMenu(false);
                router.push("/transfer-editor");
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuItem({
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
    <Pressable testID={testID} onPress={onPress} style={styles.menuItem}>
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={18} color={theme.colors.brandPrimary} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
    </Pressable>
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
  netRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  netHint: {
    fontFamily: theme.font.text,
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  netChange: {
    fontFamily: theme.font.numeric,
    fontSize: 12,
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

  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  menuCard: {
    position: "absolute",
    right: theme.spacing.lg,
    minWidth: 240,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md,
    padding: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.sm,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontFamily: theme.font.text,
    color: theme.colors.onSurface,
    fontSize: 14,
  },
});

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";

import { theme } from "@/src/theme";
import { api, Transaction, fmtMoney, currentMonth, fmtMonth } from "@/src/api";

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<"expense" | "income">("expense");
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(currentMonth());

  const load = useCallback(async () => {
    try {
      const t = await api.listTransactions(month, tab);
      setTxs(t);
    } catch (e) {
      console.log("tx load error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month, tab]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    load();
  }, [load]);

  // group by date
  const grouped: Record<string, Transaction[]> = {};
  for (const t of txs) {
    (grouped[t.date] = grouped[t.date] || []).push(t);
  }
  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const renderDay = ({ item: day }: { item: string }) => {
    const list = grouped[day];
    const total = list.reduce((s, t) => s + t.amount, 0);
    const d = new Date(day);
    return (
      <View style={styles.daySection}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayDate}>
            {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </Text>
          <Text style={styles.dayTotal}>{fmtMoney(total)}</Text>
        </View>
        {list.map((t) => (
          <Pressable
            key={t.id}
            testID={`tx-row-${t.id}`}
            onPress={() =>
              router.push({
                pathname: "/transaction-editor",
                params: {
                  id: t.id,
                  date: t.date,
                  amount: String(t.amount),
                  description: t.description,
                  category: t.category,
                  type: t.type,
                  month,
                },
              })
            }
            style={styles.txRow}
          >
            <View style={styles.txIcon}>
              <Ionicons
                name={t.type === "expense" ? "arrow-down" : "arrow-up"}
                size={16}
                color={t.type === "expense" ? theme.colors.error : theme.colors.success}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.txDesc} numberOfLines={1}>
                {t.description || t.category}
              </Text>
              <Text style={styles.txCat}>{t.category}</Text>
            </View>
            <Text
              style={[
                styles.txAmount,
                { color: t.type === "expense" ? theme.colors.onSurface : theme.colors.success },
              ]}
            >
              {t.type === "expense" ? "-" : "+"}
              {fmtMoney(t.amount)}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>{fmtMonth(month)}</Text>

        <View style={styles.segmented}>
          <Pressable
            testID="tx-tab-expense"
            style={[styles.segment, tab === "expense" && styles.segmentActive]}
            onPress={() => setTab("expense")}
          >
            <Text style={[styles.segmentText, tab === "expense" && styles.segmentTextActive]}>
              Expenses
            </Text>
          </Pressable>
          <Pressable
            testID="tx-tab-income"
            style={[styles.segment, tab === "income" && styles.segmentActive]}
            onPress={() => setTab("income")}
          >
            <Text style={[styles.segmentText, tab === "income" && styles.segmentTextActive]}>
              Income
            </Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.brandPrimary} />
      ) : days.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={40} color={theme.colors.onSurfaceTertiary} />
          <Text style={styles.emptyText}>No {tab === "expense" ? "expenses" : "income"} yet.</Text>
          <Pressable
            testID="empty-add-btn"
            style={styles.emptyBtn}
            onPress={() => router.push({ pathname: "/transaction-editor", params: { type: tab, month } })}
          >
            <Text style={styles.emptyBtnText}>Add {tab === "expense" ? "Expense" : "Income"}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={days}
          keyExtractor={(d) => d}
          renderItem={renderDay}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }}
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
        />
      )}

      <Pressable
        testID="tx-add-fab"
        style={[styles.fab, { bottom: insets.bottom + 84 }]}
        onPress={() => router.push({ pathname: "/transaction-editor", params: { type: tab, month } })}
      >
        <Ionicons name="add" size={28} color={theme.colors.onBrandPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontFamily: theme.font.display,
    fontSize: 24,
    color: theme.colors.onSurface,
  },
  subtitle: {
    fontFamily: theme.font.text,
    fontSize: 13,
    color: theme.colors.onSurfaceTertiary,
    marginTop: 2,
  },
  segmented: {
    flexDirection: "row",
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surfaceTertiary,
    borderRadius: theme.radius.pill,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: theme.radius.pill,
  },
  segmentActive: { backgroundColor: theme.colors.surfaceSecondary },
  segmentText: { fontFamily: theme.font.text, fontSize: 13, color: theme.colors.onSurfaceTertiary },
  segmentTextActive: { color: theme.colors.onSurface },

  daySection: {
    marginTop: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.brandTertiary,
  },
  dayDate: {
    fontFamily: theme.font.text,
    fontSize: 12,
    color: theme.colors.onBrandTertiary,
  },
  dayTotal: {
    fontFamily: theme.font.numeric,
    fontSize: 12,
    color: theme.colors.onBrandTertiary,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
    gap: theme.spacing.md,
  },
  txIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  txDesc: {
    fontFamily: theme.font.text,
    fontSize: 14,
    color: theme.colors.onSurface,
  },
  txCat: {
    fontFamily: theme.font.text,
    fontSize: 11,
    color: theme.colors.onSurfaceTertiary,
    marginTop: 2,
  },
  txAmount: {
    fontFamily: theme.font.numeric,
    fontSize: 15,
  },

  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  emptyText: {
    marginTop: theme.spacing.md,
    fontFamily: theme.font.text,
    color: theme.colors.onSurfaceTertiary,
  },
  emptyBtn: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.brandPrimary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 12,
    borderRadius: theme.radius.pill,
  },
  emptyBtnText: {
    color: theme.colors.onBrandPrimary,
    fontFamily: theme.font.text,
    fontSize: 14,
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

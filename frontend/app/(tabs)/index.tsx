import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";

import { theme } from "@/src/theme";
import { api, Summary, fmtMoney, fmtMonth, currentMonth } from "@/src/api";

const HERO = "https://images.pexels.com/photos/4046791/pexels-photo-4046791.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [month, setMonth] = useState(currentMonth());
  const [months, setMonths] = useState<string[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [tab, setTab] = useState<"expense" | "income">("expense");

  const load = useCallback(
    async (m: string) => {
      try {
        const [s, mm] = await Promise.all([api.getSummary(m), api.getMonths()]);
        setSummary(s);
        setMonths(mm.months);
      } catch (e) {
        console.log("load error", e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    load(month);
  }, [month, load]);

  useFocusEffect(
    useCallback(() => {
      load(month);
    }, [month, load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load(month);
  };

  const cats = (summary?.categories || []).filter((c) => c.type === tab);
  const total = tab === "expense" ? summary?.actual_expense || 0 : summary?.actual_income || 0;
  const totalPlanned = tab === "expense" ? summary?.planned_expense || 0 : summary?.planned_income || 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brandPrimary} />}
      >
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
          <Image source={HERO} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient
            colors={["rgba(26,28,26,0.15)", "rgba(26,28,26,0.80)"]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>MY BUDGET</Text>
              <Pressable
                testID="month-picker-btn"
                onPress={() => setShowMonthPicker(true)}
                style={styles.monthChip}
              >
                <Text style={styles.monthChipText}>{fmtMonth(month)}</Text>
                <Ionicons name="chevron-down" size={14} color={theme.colors.onSurfaceInverse} />
              </Pressable>
            </View>
          </View>

          <View style={styles.heroBalanceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroCaption}>End balance</Text>
              <Text style={styles.heroBalance} testID="dashboard-end-balance">
                {fmtMoney(summary?.end_balance || 0)}
              </Text>
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Start</Text>
              <Text style={styles.heroStatValue}>{fmtMoney(summary?.starting_balance || 0)}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Saved</Text>
              <Text
                style={[
                  styles.heroStatValue,
                  { color: (summary?.saved_this_month || 0) >= 0 ? "#B9E4C9" : "#F0B9AF" },
                ]}
              >
                {fmtMoney(summary?.saved_this_month || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="arrow-down-circle" size={18} color={theme.colors.error} />
              <Text style={styles.summaryLabel}>Expenses</Text>
            </View>
            <Text style={styles.summaryValue} testID="dashboard-actual-expense">
              {fmtMoney(summary?.actual_expense || 0)}
            </Text>
            <Text style={styles.summaryHint}>of {fmtMoney(summary?.planned_expense || 0)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="arrow-up-circle" size={18} color={theme.colors.success} />
              <Text style={styles.summaryLabel}>Income</Text>
            </View>
            <Text style={styles.summaryValue} testID="dashboard-actual-income">
              {fmtMoney(summary?.actual_income || 0)}
            </Text>
            <Text style={styles.summaryHint}>of {fmtMoney(summary?.planned_income || 0)}</Text>
          </View>
        </View>

        {/* Segmented tab */}
        <View style={styles.segmented}>
          <Pressable
            testID="dashboard-tab-expense"
            style={[styles.segment, tab === "expense" && styles.segmentActive]}
            onPress={() => setTab("expense")}
          >
            <Text style={[styles.segmentText, tab === "expense" && styles.segmentTextActive]}>
              Expenses
            </Text>
          </Pressable>
          <Pressable
            testID="dashboard-tab-income"
            style={[styles.segment, tab === "income" && styles.segmentActive]}
            onPress={() => setTab("income")}
          >
            <Text style={[styles.segmentText, tab === "income" && styles.segmentTextActive]}>
              Income
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {tab === "expense" ? "Expense" : "Income"} Categories
          </Text>
          <Pressable
            testID="add-category-btn"
            onPress={() => router.push({ pathname: "/category-editor", params: { month, type: tab } })}
            style={styles.sectionAction}
          >
            <Ionicons name="add" size={16} color={theme.colors.brandPrimary} />
            <Text style={styles.sectionActionText}>Add</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 30 }} color={theme.colors.brandPrimary} />
        ) : cats.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No categories yet.</Text>
          </View>
        ) : (
          cats.map((c) => {
            const actual = c.actual || 0;
            const planned = c.planned || 0;
            const pct = planned > 0 ? Math.min(100, (actual / planned) * 100) : 0;
            const over = actual > planned && planned > 0;
            return (
              <Pressable
                key={c.id}
                testID={`category-row-${c.id}`}
                onPress={() =>
                  router.push({
                    pathname: "/category-editor",
                    params: { id: c.id, name: c.name, planned: c.planned, type: c.type, month },
                  })
                }
                style={styles.catCard}
              >
                <View style={styles.catRow}>
                  <Text style={styles.catName} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.catAmount}>{fmtMoney(actual)}</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${pct}%`,
                        backgroundColor: over ? theme.colors.error : theme.colors.brandPrimary,
                      },
                    ]}
                  />
                </View>
                <View style={styles.catRow}>
                  <Text style={styles.catHint}>Planned {fmtMoney(planned)}</Text>
                  <Text
                    style={[
                      styles.catHint,
                      { color: over ? theme.colors.error : theme.colors.onSurfaceTertiary },
                    ]}
                  >
                    {over ? "Over" : "Left"} {fmtMoney(Math.abs(planned - actual))}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        testID="quick-add-fab"
        style={[styles.fab, { bottom: insets.bottom + 84 }]}
        onPress={() => router.push({ pathname: "/transaction-editor", params: { month } })}
      >
        <Ionicons name="add" size={28} color={theme.colors.onBrandPrimary} />
      </Pressable>

      {/* Month picker modal */}
      <Modal
        transparent
        visible={showMonthPicker}
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowMonthPicker(false)}>
          <Pressable style={styles.monthModal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.monthModalTitle}>Select month</Text>
            <FlatList
              data={months}
              keyExtractor={(m) => m}
              renderItem={({ item }) => (
                <Pressable
                  testID={`month-option-${item}`}
                  onPress={() => {
                    setMonth(item);
                    setShowMonthPicker(false);
                  }}
                  style={[styles.monthOption, item === month && styles.monthOptionActive]}
                >
                  <Text
                    style={[
                      styles.monthOptionText,
                      item === month && styles.monthOptionTextActive,
                    ]}
                  >
                    {fmtMonth(item)}
                  </Text>
                  {item === month && (
                    <Ionicons name="checkmark" size={18} color={theme.colors.brandPrimary} />
                  )}
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.colors.divider }} />}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 260,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    overflow: "hidden",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLabel: {
    color: "rgba(255,255,255,0.75)",
    fontFamily: theme.font.text,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  monthChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    alignSelf: "flex-start",
  },
  monthChipText: {
    color: theme.colors.onSurfaceInverse,
    fontFamily: theme.font.text,
    fontSize: 13,
  },
  heroBalanceRow: {
    marginTop: theme.spacing.xl,
    flexDirection: "row",
  },
  heroCaption: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontFamily: theme.font.text,
    marginBottom: 4,
  },
  heroBalance: {
    color: theme.colors.onSurfaceInverse,
    fontSize: 40,
    fontFamily: theme.font.numeric,
  },
  heroStatsRow: {
    flexDirection: "row",
    marginTop: theme.spacing.lg,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  heroStat: { flex: 1 },
  heroStatDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.15)", marginHorizontal: theme.spacing.md },
  heroStatLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontFamily: theme.font.text,
    marginBottom: 2,
  },
  heroStatValue: {
    color: theme.colors.onSurfaceInverse,
    fontFamily: theme.font.numeric,
    fontSize: 16,
  },

  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    marginTop: -theme.spacing.md,
    gap: theme.spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: theme.spacing.sm,
  },
  summaryLabel: {
    fontFamily: theme.font.text,
    fontSize: 12,
    color: theme.colors.onSurfaceTertiary,
  },
  summaryValue: {
    fontFamily: theme.font.numeric,
    fontSize: 20,
    color: theme.colors.onSurface,
  },
  summaryHint: {
    fontFamily: theme.font.text,
    fontSize: 11,
    color: theme.colors.onSurfaceTertiary,
    marginTop: 2,
  },

  segmented: {
    flexDirection: "row",
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
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
  segmentText: {
    fontFamily: theme.font.text,
    color: theme.colors.onSurfaceTertiary,
    fontSize: 13,
  },
  segmentTextActive: { color: theme.colors.onSurface },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontFamily: theme.font.display,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  sectionAction: { flexDirection: "row", alignItems: "center", gap: 2 },
  sectionActionText: {
    color: theme.colors.brandPrimary,
    fontFamily: theme.font.text,
    fontSize: 13,
  },

  catCard: {
    backgroundColor: theme.colors.surfaceSecondary,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  catRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  catName: {
    fontFamily: theme.font.text,
    fontSize: 14,
    color: theme.colors.onSurface,
    flex: 1,
    marginRight: 8,
  },
  catAmount: {
    fontFamily: theme.font.numeric,
    fontSize: 14,
    color: theme.colors.onSurface,
  },
  progressTrack: {
    height: 6,
    backgroundColor: theme.colors.surfaceTertiary,
    borderRadius: theme.radius.pill,
    marginVertical: theme.spacing.sm,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: theme.radius.pill },
  catHint: {
    fontFamily: theme.font.text,
    fontSize: 11,
    color: theme.colors.onSurfaceTertiary,
  },
  empty: {
    padding: theme.spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: theme.font.text,
    color: theme.colors.onSurfaceTertiary,
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

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  monthModal: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.lg,
    width: "100%",
    maxHeight: "70%",
    padding: theme.spacing.lg,
  },
  monthModalTitle: {
    fontFamily: theme.font.display,
    fontSize: 16,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.md,
  },
  monthOption: {
    paddingVertical: theme.spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  monthOptionActive: {},
  monthOptionText: {
    fontFamily: theme.font.text,
    fontSize: 15,
    color: theme.colors.onSurface,
  },
  monthOptionTextActive: {
    color: theme.colors.brandPrimary,
  },
});

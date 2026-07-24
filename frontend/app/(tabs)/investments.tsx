import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  TextInput,
  Modal,
} from "react-native";
import { PieChart } from "react-native-gifted-charts";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { theme } from "@/src/theme";
import { api, Allocation, Summary, fmtMoney, currentMonth } from "@/src/api";

const COLORS = [
  "#4B6955",
  "#7A9985",
  "#B7A16E",
  "#AA4235",
  "#5D635E",
  "#3A6044",
  "#B37A2C",
  "#8B5E3C",
  "#4A6B7A",
];

export default function InvestmentsScreen() {
  const insets = useSafeAreaInsets();
  const [allocs, setAllocs] = useState<Allocation[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Allocation | null>(null);
  const [editVal, setEditVal] = useState("");

  const load = useCallback(async () => {
    try {
      const [a, s] = await Promise.all([api.listAllocations(), api.getSummary(currentMonth())]);
      setAllocs(a);
      setSummary(s);
    } catch (e) {
      console.log("investments load", e);
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

  const income = summary?.actual_income || 0;
  const totalPct = allocs.reduce((s, a) => s + a.percent, 0);

  const pieData = allocs
    .filter((a) => a.percent > 0)
    .map((a, i) => ({
      value: a.percent * 100,
      color: COLORS[i % COLORS.length],
      text: `${Math.round(a.percent * 100)}%`,
      label: a.name,
    }));

  const saveEdit = async () => {
    if (!editing) return;
    const pct = parseFloat(editVal) / 100;
    if (isNaN(pct) || pct < 0 || pct > 1) return;
    await api.updateAllocation(editing.id, pct);
    setEditing(null);
    setEditVal("");
    load();
  };

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
          <Text style={styles.title}>Investments</Text>
          <Text style={styles.subtitle}>
            Distribute this month&rsquo;s income into buckets
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.brandPrimary} />
        ) : (
          <>
            <View style={styles.chartCard}>
              {pieData.length > 0 ? (
                <PieChart
                  data={pieData}
                  donut
                  radius={100}
                  innerRadius={65}
                  innerCircleColor={theme.colors.surfaceSecondary}
                  centerLabelComponent={() => (
                    <View style={{ alignItems: "center" }}>
                      <Text style={styles.centerLabel}>Income</Text>
                      <Text style={styles.centerValue}>{fmtMoney(income)}</Text>
                    </View>
                  )}
                />
              ) : (
                <Text style={styles.chartEmpty}>Set allocations below</Text>
              )}
              <Text
                style={[
                  styles.totalPct,
                  { color: Math.abs(totalPct - 1) < 0.001 ? theme.colors.success : theme.colors.warning },
                ]}
              >
                Total allocation: {Math.round(totalPct * 100)}%
              </Text>
            </View>

            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Buckets</Text>
              <Text style={styles.listHint}>Tap % to edit</Text>
            </View>

            {allocs.map((a, i) => {
              const amt = income * a.percent;
              return (
                <Pressable
                  key={a.id}
                  testID={`alloc-row-${a.id}`}
                  onPress={() => {
                    setEditing(a);
                    setEditVal(String(Math.round(a.percent * 100)));
                  }}
                  style={styles.allocCard}
                >
                  <View
                    style={[styles.dot, { backgroundColor: COLORS[i % COLORS.length] }]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.allocName}>{a.name}</Text>
                    <Text style={styles.allocSub}>{Math.round(a.percent * 100)}% of income</Text>
                  </View>
                  <Text style={styles.allocAmt}>{fmtMoney(amt)}</Text>
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>

      <Modal transparent visible={!!editing} animationType="fade" onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setEditing(null)}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{editing?.name} allocation</Text>
            <View style={styles.inputRow}>
              <TextInput
                testID="alloc-input"
                value={editVal}
                onChangeText={setEditVal}
                keyboardType="numeric"
                style={styles.input}
                placeholder="0"
                placeholderTextColor={theme.colors.onSurfaceTertiary}
                autoFocus
              />
              <Text style={styles.inputSuffix}>%</Text>
            </View>
            <View style={styles.modalActions}>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setEditing(null)}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.btnPrimary]} onPress={saveEdit} testID="alloc-save">
                <Text style={styles.btnPrimaryText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: { fontFamily: theme.font.display, fontSize: 24, color: theme.colors.onSurface },
  subtitle: {
    fontFamily: theme.font.text,
    fontSize: 13,
    color: theme.colors.onSurfaceTertiary,
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: theme.colors.surfaceSecondary,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  chartEmpty: {
    color: theme.colors.onSurfaceTertiary,
    fontFamily: theme.font.text,
    paddingVertical: 40,
  },
  centerLabel: {
    fontFamily: theme.font.text,
    fontSize: 11,
    color: theme.colors.onSurfaceTertiary,
  },
  centerValue: {
    fontFamily: theme.font.numeric,
    fontSize: 16,
    color: theme.colors.onSurface,
    marginTop: 2,
  },
  totalPct: {
    marginTop: theme.spacing.lg,
    fontFamily: theme.font.text,
    fontSize: 12,
  },

  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  listTitle: { fontFamily: theme.font.display, fontSize: 16, color: theme.colors.onSurface },
  listHint: { fontFamily: theme.font.text, fontSize: 12, color: theme.colors.onSurfaceTertiary },

  allocCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceSecondary,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  allocName: { fontFamily: theme.font.text, fontSize: 14, color: theme.colors.onSurface },
  allocSub: { fontFamily: theme.font.text, fontSize: 11, color: theme.colors.onSurfaceTertiary, marginTop: 2 },
  allocAmt: { fontFamily: theme.font.numeric, fontSize: 15, color: theme.colors.onSurface },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: theme.spacing.xl,
  },
  modal: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
  },
  modalTitle: { fontFamily: theme.font.display, fontSize: 16, color: theme.colors.onSurface, marginBottom: theme.spacing.md },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceTertiary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
  },
  input: {
    flex: 1,
    fontFamily: theme.font.numeric,
    fontSize: 20,
    color: theme.colors.onSurface,
    paddingVertical: theme.spacing.md,
  },
  inputSuffix: { fontFamily: theme.font.text, color: theme.colors.onSurfaceTertiary, fontSize: 16 },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  btn: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
  },
  btnPrimary: { backgroundColor: theme.colors.brandPrimary },
  btnPrimaryText: { color: theme.colors.onBrandPrimary, fontFamily: theme.font.text, fontSize: 14 },
  btnGhost: { backgroundColor: theme.colors.surfaceTertiary },
  btnGhostText: { color: theme.colors.onSurface, fontFamily: theme.font.text, fontSize: 14 },
});

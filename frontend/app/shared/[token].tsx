import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "@/src/theme";
import { fmtMoney, fmtMonth } from "@/src/api";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function SharedBudget() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [editVal, setEditVal] = useState("");
  const [tab, setTab] = useState<"expense" | "income">("expense");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/shared/${token}`);
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      setData(d);
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const saveEdit = async () => {
    if (!editing) return;
    const v = parseFloat(editVal);
    if (isNaN(v)) return;
    await fetch(`${BASE}/api/shared/${token}/category`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category_id: editing.id, planned: v }),
    });
    setEditing(null);
    setEditVal("");
    load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.brandPrimary} />
      </View>
    );
  }
  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color={theme.colors.error} />
        <Text style={styles.errText}>Shared budget not found or link revoked.</Text>
        <Pressable
          testID="shared-back-home"
          style={styles.btn}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={styles.btnText}>Go to app</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const s = data.summary;
  const write = data.write;
  const cats = (s.categories || []).filter((c: any) => c.type === tab);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.surface }} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable testID="shared-close" onPress={() => router.replace("/(tabs)")}>
          <Ionicons name="close" size={24} color={theme.colors.onSurface} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {data.budget.name}
          </Text>
          <View style={styles.badge}>
            <Ionicons
              name={write ? "create-outline" : "eye-outline"}
              size={11}
              color={theme.colors.onBrandSecondary}
            />
            <Text style={styles.badgeText}>{write ? "Editable" : "View-only"}</Text>
          </View>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        <Text style={styles.month}>{fmtMonth(data.budget.month)}</Text>

        <View style={styles.balanceRow}>
          <View style={styles.balCard}>
            <Text style={styles.balLbl}>Start</Text>
            <Text style={styles.balVal}>{fmtMoney(s.starting_balance)}</Text>
          </View>
          <View style={styles.balCard}>
            <Text style={styles.balLbl}>End</Text>
            <Text style={styles.balVal}>{fmtMoney(s.end_balance)}</Text>
          </View>
          <View style={styles.balCard}>
            <Text style={styles.balLbl}>Saved</Text>
            <Text
              style={[
                styles.balVal,
                { color: s.saved_this_month >= 0 ? theme.colors.success : theme.colors.error },
              ]}
            >
              {fmtMoney(s.saved_this_month)}
            </Text>
          </View>
        </View>

        <View style={styles.segmented}>
          <Pressable
            testID="shared-tab-expense"
            style={[styles.segment, tab === "expense" && styles.segmentActive]}
            onPress={() => setTab("expense")}
          >
            <Text style={[styles.segmentText, tab === "expense" && styles.segmentTextActive]}>
              Expenses ({fmtMoney(s.actual_expense)})
            </Text>
          </Pressable>
          <Pressable
            testID="shared-tab-income"
            style={[styles.segment, tab === "income" && styles.segmentActive]}
            onPress={() => setTab("income")}
          >
            <Text style={[styles.segmentText, tab === "income" && styles.segmentTextActive]}>
              Income ({fmtMoney(s.actual_income)})
            </Text>
          </Pressable>
        </View>

        {cats.map((c: any) => {
          const pct = c.planned > 0 ? Math.min(100, (c.actual / c.planned) * 100) : 0;
          const over = c.actual > c.planned && c.planned > 0;
          return (
            <Pressable
              key={c.id}
              testID={`shared-cat-${c.id}`}
              disabled={!write}
              onPress={() => {
                setEditing(c);
                setEditVal(String(c.planned));
              }}
              style={styles.catCard}
            >
              <View style={styles.catRow}>
                <Text style={styles.catName}>{c.name}</Text>
                <Text style={styles.catAmount}>{fmtMoney(c.actual)}</Text>
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
                <Text style={styles.catHint}>Planned {fmtMoney(c.planned)}</Text>
                {write && (
                  <Text style={[styles.catHint, { color: theme.colors.brandPrimary }]}>Tap to edit</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal
        transparent
        visible={!!editing}
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.sheetBackdrop} onPress={() => setEditing(null)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.sheetTitle}>{editing?.name} planned</Text>
              <View style={styles.sheetBody}>
                <TextInput
                  testID="shared-edit-input"
                  value={editVal}
                  onChangeText={setEditVal}
                  keyboardType="decimal-pad"
                  style={styles.input}
                  autoFocus
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.onSurfaceTertiary}
                />
                <Pressable testID="shared-edit-save" onPress={saveEdit} style={styles.btn}>
                  <Text style={styles.btnText}>Save</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    gap: 12,
  },
  errText: {
    fontFamily: theme.font.text,
    color: theme.colors.onSurfaceTertiary,
    textAlign: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  headerCenter: { flex: 1, alignItems: "center", gap: 4 },
  headerTitle: {
    fontFamily: theme.font.display,
    fontSize: 15,
    color: theme.colors.onSurface,
  },
  badge: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    backgroundColor: theme.colors.brandSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  badgeText: {
    fontFamily: theme.font.text,
    fontSize: 10,
    color: theme.colors.onBrandSecondary,
  },
  month: {
    fontFamily: theme.font.display,
    fontSize: 22,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.md,
  },

  balanceRow: { flexDirection: "row", gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  balCard: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  balLbl: {
    fontFamily: theme.font.text,
    fontSize: 11,
    color: theme.colors.onSurfaceTertiary,
  },
  balVal: {
    fontFamily: theme.font.numeric,
    fontSize: 15,
    color: theme.colors.onSurface,
    marginTop: 2,
  },

  segmented: {
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceTertiary,
    borderRadius: theme.radius.pill,
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  segment: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: theme.radius.pill },
  segmentActive: { backgroundColor: theme.colors.surfaceSecondary },
  segmentText: {
    fontFamily: theme.font.text,
    fontSize: 12,
    color: theme.colors.onSurfaceTertiary,
  },
  segmentTextActive: { color: theme.colors.onSurface },

  catCard: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  catRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  catName: {
    fontFamily: theme.font.text,
    fontSize: 14,
    color: theme.colors.onSurface,
  },
  catAmount: { fontFamily: theme.font.numeric, fontSize: 14, color: theme.colors.onSurface },
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

  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  sheetBody: {},
  sheetTitle: {
    fontFamily: theme.font.display,
    fontSize: 16,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.md,
  },
  input: {
    backgroundColor: theme.colors.surfaceTertiary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    fontFamily: theme.font.numeric,
    fontSize: 20,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.md,
  },
  btn: {
    backgroundColor: theme.colors.brandPrimary,
    paddingVertical: 14,
    borderRadius: theme.radius.pill,
    alignItems: "center",
  },
  btnText: {
    color: theme.colors.onBrandPrimary,
    fontFamily: theme.font.text,
    fontSize: 15,
  },
});

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
  Share,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { theme } from "@/src/theme";
import { api, Budget, fmtMonth, currentMonth, nextMonth } from "@/src/api";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function BudgetsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newMonth, setNewMonth] = useState(currentMonth());
  const [newName, setNewName] = useState("");
  const [months, setMonths] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const [b, m] = await Promise.all([api.listBudgets(), api.getMonths()]);
      setBudgets(b);
      setMonths(m.months);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!newName || !newMonth) return;
    await api.createBudget({ month: newMonth, name: newName });
    setShowCreate(false);
    setNewName("");
    load();
  };

  const del = async (b: Budget) => {
    await api.deleteBudget(b.id);
    load();
  };

  const share = async (b: Budget, write: boolean) => {
    const res = await api.shareBudget(b.id, write);
    const link = `${BASE}/shared/${res.share_token}`;
    try {
      await Clipboard.setStringAsync(link);
    } catch {}
    try {
      await Share.share({ message: `View my budget: ${link}` });
    } catch {}
    load();
  };

  const unshare = async (b: Budget) => {
    await api.unshareBudget(b.id);
    load();
  };

  const exportExcel = async (month: string) => {
    const { url, token } = await api.exportExcelUrl(month);
    if (Platform.OS === "web") {
      // Fetch as blob with auth then trigger download
      try {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const blob = await r.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `budget-${month}.xlsx`;
        a.click();
      } catch (e) {
        Alert.alert("Export failed");
      }
    } else {
      try {
        await Share.share({ message: `Excel export: ${url}?token=${token}` });
      } catch {}
    }
  };

  const rollover = async (b: Budget) => {
    const next = nextMonth(b.month);
    await api.rollover(b.month, next);
    Alert.alert("Rollover", `Copied categories from ${fmtMonth(b.month)} to ${fmtMonth(next)}. Account balances carried forward.`);
    load();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="budgets-back" onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Budgets</Text>
        <Pressable testID="budget-new" onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={26} color={theme.colors.onSurface} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 60 }}>
        {loading ? (
          <ActivityIndicator color={theme.colors.brandPrimary} style={{ marginTop: 30 }} />
        ) : (
          <>
            <Text style={styles.helperText}>
              Save budget snapshots per month, export as Excel, share links with anyone, and roll
              forward category plans + account balances to the next month.
            </Text>

            {budgets.length === 0 && (
              <View style={styles.emptyCard}>
                <Ionicons name="folder-outline" size={26} color={theme.colors.onSurfaceTertiary} />
                <Text style={styles.emptyText}>No saved budgets yet.</Text>
              </View>
            )}

            {budgets.map((b) => (
              <View key={b.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{b.name}</Text>
                    <Text style={styles.cardSub}>{fmtMonth(b.month)}</Text>
                  </View>
                  <Pressable
                    testID={`budget-del-${b.id}`}
                    onPress={() => del(b)}
                    hitSlop={10}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                  </Pressable>
                </View>

                {b.share_token ? (
                  <View style={styles.shareBox}>
                    <Ionicons name="link-outline" size={14} color={theme.colors.brandPrimary} />
                    <Text style={styles.shareLink} numberOfLines={1}>
                      {BASE}/shared/{b.share_token}
                    </Text>
                    <Text style={styles.sharePerm}>
                      {b.share_write ? "Read + Edit" : "Read-only"}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.actions}>
                  <ActionChip
                    testID={`budget-export-${b.id}`}
                    icon="download-outline"
                    label="Export .xlsx"
                    onPress={() => exportExcel(b.month)}
                  />
                  <ActionChip
                    testID={`budget-share-read-${b.id}`}
                    icon="share-outline"
                    label="Share (view)"
                    onPress={() => share(b, false)}
                  />
                  <ActionChip
                    testID={`budget-share-write-${b.id}`}
                    icon="create-outline"
                    label="Share (edit)"
                    onPress={() => share(b, true)}
                  />
                  <ActionChip
                    testID={`budget-rollover-${b.id}`}
                    icon="arrow-forward-circle-outline"
                    label="Roll to next"
                    onPress={() => rollover(b)}
                  />
                  {b.share_token && (
                    <ActionChip
                      testID={`budget-unshare-${b.id}`}
                      icon="close-circle-outline"
                      label="Revoke link"
                      onPress={() => unshare(b)}
                    />
                  )}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <Modal
        transparent
        visible={showCreate}
        animationType="slide"
        onRequestClose={() => setShowCreate(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowCreate(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.sheetTitle}>New budget</Text>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                testID="new-budget-name"
                value={newName}
                onChangeText={setNewName}
                style={styles.textInput}
                placeholder="e.g. Family July 2026"
                placeholderTextColor={theme.colors.onSurfaceTertiary}
              />
              <Text style={styles.fieldLabel}>Month</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {months.map((m) => (
                  <Pressable
                    key={m}
                    testID={`new-budget-month-${m}`}
                    onPress={() => setNewMonth(m)}
                    style={[styles.chip, newMonth === m && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, newMonth === m && styles.chipTextActive]}>
                      {fmtMonth(m)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable
                testID="new-budget-save"
                onPress={create}
                style={[styles.saveBtn, (!newName || !newMonth) && { opacity: 0.5 }]}
              >
                <Text style={styles.saveBtnText}>Create</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function ActionChip({
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
    <Pressable testID={testID} onPress={onPress} style={styles.actionChip}>
      <Ionicons name={icon} size={14} color={theme.colors.onBrandSecondary} />
      <Text style={styles.actionChipText}>{label}</Text>
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
  helperText: {
    fontFamily: theme.font.text,
    fontSize: 13,
    color: theme.colors.onSurfaceTertiary,
    marginBottom: theme.spacing.lg,
    lineHeight: 18,
  },
  emptyCard: {
    padding: theme.spacing.xl,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontFamily: theme.font.text,
    color: theme.colors.onSurfaceTertiary,
    fontSize: 13,
  },
  card: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  cardHead: { flexDirection: "row", alignItems: "flex-start" },
  cardTitle: {
    fontFamily: theme.font.display,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  cardSub: {
    fontFamily: theme.font.text,
    fontSize: 12,
    color: theme.colors.onSurfaceTertiary,
    marginTop: 2,
  },
  shareBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.brandTertiary,
    borderRadius: theme.radius.sm,
  },
  shareLink: {
    flex: 1,
    fontFamily: theme.font.text,
    fontSize: 11,
    color: theme.colors.onBrandTertiary,
  },
  sharePerm: {
    fontFamily: theme.font.text,
    fontSize: 10,
    color: theme.colors.brandPrimary,
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: theme.spacing.md,
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: theme.colors.brandSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
  },
  actionChipText: {
    fontFamily: theme.font.text,
    fontSize: 11,
    color: theme.colors.onBrandSecondary,
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
  },
  sheetTitle: {
    fontFamily: theme.font.display,
    fontSize: 16,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.md,
  },
  fieldLabel: {
    fontFamily: theme.font.text,
    fontSize: 11,
    color: theme.colors.onSurfaceTertiary,
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  textInput: {
    backgroundColor: theme.colors.surfaceTertiary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontFamily: theme.font.text,
    fontSize: 15,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.md,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceTertiary,
  },
  chipActive: {
    backgroundColor: theme.colors.brandSecondary,
  },
  chipText: {
    fontFamily: theme.font.text,
    fontSize: 12,
    color: theme.colors.onSurfaceTertiary,
  },
  chipTextActive: {
    color: theme.colors.onBrandSecondary,
  },
  saveBtn: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.brandPrimary,
    paddingVertical: 14,
    borderRadius: theme.radius.pill,
    alignItems: "center",
  },
  saveBtnText: {
    color: theme.colors.onBrandPrimary,
    fontFamily: theme.font.text,
    fontSize: 15,
  },
});

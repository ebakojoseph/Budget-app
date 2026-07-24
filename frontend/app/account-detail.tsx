import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";

import { theme } from "@/src/theme";
import { api, Account, Transaction, BalanceSnapshot, fmtMoney, currentMonth, fmtMonth } from "@/src/api";

export default function AccountDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [account, setAccount] = useState<Account | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [snaps, setSnaps] = useState<BalanceSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEomModal, setShowEomModal] = useState(false);
  const [eomBalance, setEomBalance] = useState("");
  const [eomMonth, setEomMonth] = useState(currentMonth());

  const load = useCallback(async () => {
    try {
      const [accs, t, s] = await Promise.all([
        api.listAccounts(),
        api.listTransactions({ account_id: id }),
        api.listSnapshots(),
      ]);
      const a = accs.find((x) => x.id === id) || null;
      setAccount(a);
      setTxs(t);
      setSnaps(s.filter((x) => x.account_id === id));
    } catch (e) {
      console.log("acc detail error", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const saveEom = async () => {
    const bal = parseFloat(eomBalance);
    if (isNaN(bal) || !account) return;
    await api.createSnapshot({ account_id: account.id, month: eomMonth, balance: bal });
    setShowEomModal(false);
    setEomBalance("");
    load();
  };

  if (loading || !account) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface, justifyContent: "center" }}>
        <ActivityIndicator color={theme.colors.brandPrimary} />
      </View>
    );
  }

  const change = account.balance - (account.brought_forward || 0);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="acc-detail-back" onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {account.name}
        </Text>
        <Pressable
          testID="acc-detail-edit"
          onPress={() =>
            router.push({
              pathname: "/account-editor",
              params: {
                id: account.id,
                name: account.name,
                group: account.group,
                balance: String(account.balance),
              },
            })
          }
        >
          <Ionicons name="create-outline" size={22} color={theme.colors.onSurface} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.balCard}>
          <Text style={styles.balLabel}>Current balance</Text>
          <Text style={styles.balValue}>{fmtMoney(account.balance)}</Text>
          <View style={styles.balRow}>
            <View>
              <Text style={styles.balSub}>Brought forward</Text>
              <Text style={styles.balSubVal}>{fmtMoney(account.brought_forward)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.balSub}>Gain / loss</Text>
              <Text
                style={[
                  styles.balSubVal,
                  { color: change >= 0 ? "#B9E4C9" : "#F0B9AF" },
                ]}
              >
                {change >= 0 ? "+" : ""}
                {fmtMoney(change)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <ActionBtn
            testID="acc-add-tx"
            icon="add-circle-outline"
            label="Add transaction"
            onPress={() =>
              router.push({
                pathname: "/transaction-editor",
                params: { account_id: account.id },
              })
            }
          />
          <ActionBtn
            testID="acc-add-transfer"
            icon="swap-horizontal-outline"
            label="Transfer"
            onPress={() => router.push("/transfer-editor")}
          />
          <ActionBtn
            testID="acc-eom-btn"
            icon="calendar-outline"
            label="End-of-month"
            onPress={() => setShowEomModal(true)}
          />
        </View>

        {snaps.length > 0 && (
          <>
            <SectionTitle title="Month-end balances" />
            {snaps
              .slice()
              .sort((a, b) => b.month.localeCompare(a.month))
              .map((s) => (
                <View key={s.id} testID={`snap-${s.id}`} style={styles.snapRow}>
                  <Text style={styles.snapMonth}>{fmtMonth(s.month)}</Text>
                  <Text style={styles.snapVal}>{fmtMoney(s.balance)}</Text>
                </View>
              ))}
          </>
        )}

        <SectionTitle title={`Transactions (${txs.length})`} />
        {txs.length === 0 ? (
          <Text style={styles.empty}>No transactions on this account yet.</Text>
        ) : (
          txs.map((t) => {
            const isTransfer = t.type === "transfer";
            const isOutgoing = isTransfer && t.account_id === account.id;
            const isIncoming = isTransfer && t.to_account_id === account.id;
            const sign =
              t.type === "income" || isIncoming ? "+" : t.type === "expense" || isOutgoing ? "-" : "";
            const color =
              t.type === "income" || isIncoming ? theme.colors.success : theme.colors.onSurface;
            return (
              <Pressable
                key={t.id}
                testID={`acc-tx-${t.id}`}
                onPress={() => {
                  if (isTransfer) return;
                  router.push({
                    pathname: "/transaction-editor",
                    params: {
                      id: t.id,
                      date: t.date,
                      amount: String(t.amount),
                      description: t.description,
                      category: t.category,
                      type: t.type,
                      month: t.month,
                      account_id: t.account_id || undefined,
                    },
                  });
                }}
                style={styles.txRow}
              >
                <View style={styles.txIcon}>
                  <Ionicons
                    name={isTransfer ? "swap-horizontal" : t.type === "expense" ? "arrow-down" : "arrow-up"}
                    size={16}
                    color={
                      isTransfer
                        ? theme.colors.info
                        : t.type === "expense"
                        ? theme.colors.error
                        : theme.colors.success
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txDesc}>{t.description || t.category}</Text>
                  <Text style={styles.txDate}>{t.date}</Text>
                </View>
                <Text style={[styles.txAmount, { color }]}>
                  {sign}
                  {fmtMoney(t.amount)}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Modal
        transparent
        visible={showEomModal}
        animationType="slide"
        onRequestClose={() => setShowEomModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowEomModal(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.sheetTitle}>Enter end-of-month balance</Text>
              <Text style={styles.sheetSub}>
                Set the actual balance for a month. The difference from brought-forward becomes this
                month&rsquo;s gain and is carried over.
              </Text>
              <Text style={styles.fieldLabel}>Month</Text>
              <TextInput
                testID="eom-month"
                value={eomMonth}
                onChangeText={setEomMonth}
                style={styles.textInput}
                placeholder="YYYY-MM"
                placeholderTextColor={theme.colors.onSurfaceTertiary}
              />
              <Text style={styles.fieldLabel}>Balance</Text>
              <TextInput
                testID="eom-balance"
                value={eomBalance}
                onChangeText={setEomBalance}
                keyboardType="decimal-pad"
                style={styles.textInput}
                placeholder="0.00"
                placeholderTextColor={theme.colors.onSurfaceTertiary}
                autoFocus
              />
              <Pressable
                testID="eom-save"
                onPress={saveEom}
                style={[styles.saveBtn, !eomBalance && { opacity: 0.5 }]}
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.section}>{title}</Text>;
}

function ActionBtn({
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
    <Pressable testID={testID} onPress={onPress} style={styles.actionBtn}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={18} color={theme.colors.brandPrimary} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
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
    gap: theme.spacing.md,
  },
  headerTitle: {
    flex: 1,
    fontFamily: theme.font.display,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  balCard: {
    backgroundColor: theme.colors.surfaceInverse,
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
  },
  balLabel: {
    fontFamily: theme.font.text,
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  balValue: {
    fontFamily: theme.font.numeric,
    color: theme.colors.onSurfaceInverse,
    fontSize: 32,
    marginTop: 4,
  },
  balRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacing.md,
  },
  balSub: {
    fontFamily: theme.font.text,
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
  },
  balSubVal: {
    fontFamily: theme.font.numeric,
    color: theme.colors.onSurfaceInverse,
    fontSize: 14,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    backgroundColor: theme.colors.surfaceSecondary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    gap: 6,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontFamily: theme.font.text,
    fontSize: 11,
    color: theme.colors.onSurface,
    textAlign: "center",
  },
  section: {
    fontFamily: theme.font.display,
    fontSize: 15,
    color: theme.colors.onSurface,
    marginTop: theme.spacing.xl,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  snapRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  snapMonth: { fontFamily: theme.font.text, fontSize: 14, color: theme.colors.onSurface },
  snapVal: { fontFamily: theme.font.numeric, fontSize: 14, color: theme.colors.onSurface },

  txRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceSecondary,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  txIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  txDesc: { fontFamily: theme.font.text, fontSize: 14, color: theme.colors.onSurface },
  txDate: {
    fontFamily: theme.font.text,
    fontSize: 11,
    color: theme.colors.onSurfaceTertiary,
    marginTop: 2,
  },
  txAmount: { fontFamily: theme.font.numeric, fontSize: 14 },

  empty: {
    marginHorizontal: theme.spacing.lg,
    fontFamily: theme.font.text,
    color: theme.colors.onSurfaceTertiary,
    fontSize: 13,
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
  },
  sheetSub: {
    fontFamily: theme.font.text,
    fontSize: 12,
    color: theme.colors.onSurfaceTertiary,
    marginTop: 4,
    marginBottom: theme.spacing.lg,
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
  saveBtn: {
    marginTop: theme.spacing.md,
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

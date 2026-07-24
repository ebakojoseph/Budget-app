import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "@/src/theme";
import { api, Category, TxType, currentMonth, Account } from "@/src/api";

export default function TransactionEditor() {
  const params = useLocalSearchParams<{
    id?: string;
    date?: string;
    amount?: string;
    description?: string;
    category?: string;
    type?: TxType;
    month?: string;
    account_id?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isEdit = !!params.id;
  const initialMonth = (params.month as string) || currentMonth();

  const [type, setType] = useState<TxType>((params.type as TxType) || "expense");
  const [amount, setAmount] = useState(params.amount || "");
  const [description, setDescription] = useState(params.description || "");
  const [category, setCategory] = useState(params.category || "");
  const [date, setDate] = useState(params.date || new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState<string | null>(params.account_id || null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showAccPicker, setShowAccPicker] = useState(false);

  useEffect(() => {
    api.listCategories(initialMonth).then(setCategories).catch(() => {});
    api.listAccounts().then(setAccounts).catch(() => {});
  }, [initialMonth]);

  const catOptions = useMemo(
    () => categories.filter((c) => c.type === (type === "transfer" ? "expense" : type)),
    [categories, type]
  );
  const accountName = accounts.find((a) => a.id === accountId)?.name;

  const save = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;
    if (!category) return;
    if (isEdit) {
      await api.updateTransaction(params.id!, {
        date,
        amount: amt,
        description,
        category,
        account_id: accountId || undefined,
      });
    } else {
      await api.createTransaction({
        date,
        amount: amt,
        description,
        category,
        type: type as "expense" | "income",
        account_id: accountId || undefined,
      });
    }
    router.back();
  };

  const del = async () => {
    if (params.id) await api.deleteTransaction(params.id);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="tx-close" onPress={() => router.back()}>
          <Ionicons name="close" size={26} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>{isEdit ? "Edit" : "New"} transaction</Text>
        {isEdit ? (
          <Pressable testID="tx-delete" onPress={del}>
            <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
          </Pressable>
        ) : (
          <View style={{ width: 26 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 120 }}>
        {!isEdit && (
          <View style={styles.segmented}>
            <Pressable
              testID="tx-type-expense"
              style={[styles.segment, type === "expense" && styles.segmentActive]}
              onPress={() => setType("expense")}
            >
              <Text style={[styles.segmentText, type === "expense" && styles.segmentTextActive]}>
                Expense
              </Text>
            </Pressable>
            <Pressable
              testID="tx-type-income"
              style={[styles.segment, type === "income" && styles.segmentActive]}
              onPress={() => setType("income")}
            >
              <Text style={[styles.segmentText, type === "income" && styles.segmentTextActive]}>
                Income
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.amountBox}>
          <Text style={styles.currency}>$</Text>
          <TextInput
            testID="tx-amount"
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={theme.colors.onSurfaceTertiary}
            autoFocus={!isEdit}
          />
        </View>

        <Field label="Category">
          <Pressable
            testID="tx-category-btn"
            onPress={() => setShowCatPicker(true)}
            style={styles.selectRow}
          >
            <Text
              style={[
                styles.selectText,
                { color: category ? theme.colors.onSurface : theme.colors.onSurfaceTertiary },
              ]}
            >
              {category || "Select category"}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceTertiary} />
          </Pressable>
        </Field>

        <Field label="Account (optional)">
          <Pressable
            testID="tx-account-btn"
            onPress={() => setShowAccPicker(true)}
            style={styles.selectRow}
          >
            <Text
              style={[
                styles.selectText,
                { color: accountName ? theme.colors.onSurface : theme.colors.onSurfaceTertiary },
              ]}
            >
              {accountName || "None"}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceTertiary} />
          </Pressable>
        </Field>

        <Field label="Description">
          <TextInput
            testID="tx-description"
            value={description}
            onChangeText={setDescription}
            style={styles.textInput}
            placeholder="Optional"
            placeholderTextColor={theme.colors.onSurfaceTertiary}
          />
        </Field>

        <Field label="Date">
          <TextInput
            testID="tx-date"
            value={date}
            onChangeText={setDate}
            style={styles.textInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.colors.onSurfaceTertiary}
          />
        </Field>

        <Pressable
          testID="tx-save"
          onPress={save}
          style={[styles.saveBtn, (!amount || !category) && { opacity: 0.5 }]}
        >
          <Text style={styles.saveBtnText}>{isEdit ? "Save changes" : "Add transaction"}</Text>
        </Pressable>
      </ScrollView>

      <Modal
        transparent
        visible={showCatPicker}
        animationType="slide"
        onRequestClose={() => setShowCatPicker(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setShowCatPicker(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Select category</Text>
            <FlatList
              data={catOptions}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => (
                <Pressable
                  testID={`cat-option-${item.id}`}
                  onPress={() => {
                    setCategory(item.name);
                    setShowCatPicker(false);
                  }}
                  style={styles.catOpt}
                >
                  <Text style={styles.catOptText}>{item.name}</Text>
                  {category === item.name && (
                    <Ionicons name="checkmark" size={18} color={theme.colors.brandPrimary} />
                  )}
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.colors.divider }} />}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={showAccPicker}
        animationType="slide"
        onRequestClose={() => setShowAccPicker(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setShowAccPicker(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Select account</Text>
            <FlatList
              data={[{ id: "__none__", name: "None", group: "" } as Account, ...accounts]}
              keyExtractor={(a) => a.id}
              renderItem={({ item }) => {
                const val = item.id === "__none__" ? null : item.id;
                const selected = accountId === val;
                return (
                  <Pressable
                    testID={`acc-option-${item.id}`}
                    onPress={() => {
                      setAccountId(val);
                      setShowAccPicker(false);
                    }}
                    style={styles.catOpt}
                  >
                    <Text style={styles.catOptText}>{item.name}</Text>
                    {selected && <Ionicons name="checkmark" size={18} color={theme.colors.brandPrimary} />}
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.colors.divider }} />}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
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

  segmented: {
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceTertiary,
    borderRadius: theme.radius.pill,
    padding: 4,
    marginBottom: theme.spacing.xl,
  },
  segment: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: theme.radius.pill },
  segmentActive: { backgroundColor: theme.colors.surfaceSecondary },
  segmentText: { fontFamily: theme.font.text, fontSize: 13, color: theme.colors.onSurfaceTertiary },
  segmentTextActive: { color: theme.colors.onSurface },

  amountBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.xl,
  },
  currency: {
    fontFamily: theme.font.numeric,
    fontSize: 30,
    color: theme.colors.onSurfaceTertiary,
    marginRight: 4,
  },
  amountInput: {
    fontFamily: theme.font.numeric,
    fontSize: 48,
    color: theme.colors.onSurface,
    textAlign: "center",
    minWidth: 120,
  },

  field: { marginBottom: theme.spacing.lg },
  fieldLabel: {
    fontFamily: theme.font.text,
    fontSize: 12,
    color: theme.colors.onSurfaceTertiary,
    marginBottom: theme.spacing.sm,
    letterSpacing: 0.4,
  },
  textInput: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    fontFamily: theme.font.text,
    fontSize: 15,
    color: theme.colors.onSurface,
  },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
  },
  selectText: { fontFamily: theme.font.text, fontSize: 15 },

  saveBtn: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.brandPrimary,
    paddingVertical: 16,
    borderRadius: theme.radius.pill,
    alignItems: "center",
  },
  saveBtnText: {
    color: theme.colors.onBrandPrimary,
    fontFamily: theme.font.text,
    fontSize: 15,
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
    maxHeight: "70%",
  },
  sheetTitle: {
    fontFamily: theme.font.display,
    fontSize: 16,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.md,
  },
  catOpt: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
  },
  catOptText: { fontFamily: theme.font.text, fontSize: 15, color: theme.colors.onSurface },
});

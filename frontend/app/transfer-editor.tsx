import React, { useEffect, useState } from "react";
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
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "@/src/theme";
import { api, Account, fmtMoney } from "@/src/api";

export default function TransferEditor() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [pickerFor, setPickerFor] = useState<"from" | "to" | null>(null);

  useEffect(() => {
    api.listAccounts().then(setAccounts).catch(() => {});
  }, []);

  const fromAcc = accounts.find((a) => a.id === fromId);
  const toAcc = accounts.find((a) => a.id === toId);
  const valid = !!(fromId && toId && fromId !== toId && parseFloat(amount) > 0);

  const save = async () => {
    if (!valid) return;
    await api.createTransaction({
      date,
      amount: parseFloat(amount),
      description: description || `Transfer to ${toAcc?.name}`,
      category: "Transfer",
      type: "transfer",
      account_id: fromId!,
      to_account_id: toId!,
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="xfer-close" onPress={() => router.back()}>
          <Ionicons name="close" size={26} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Transfer</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 120 }}>
        <View style={styles.amountBox}>
          <Text style={styles.currency}>$</Text>
          <TextInput
            testID="xfer-amount"
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={theme.colors.onSurfaceTertiary}
            autoFocus
          />
        </View>

        <Field label="From">
          <Pressable
            testID="xfer-from-btn"
            onPress={() => setPickerFor("from")}
            style={styles.selectRow}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.selectText,
                  { color: fromAcc ? theme.colors.onSurface : theme.colors.onSurfaceTertiary },
                ]}
              >
                {fromAcc?.name || "Select source"}
              </Text>
              {fromAcc && (
                <Text style={styles.selectSub}>Balance {fmtMoney(fromAcc.balance)}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceTertiary} />
          </Pressable>
        </Field>

        <Field label="To">
          <Pressable
            testID="xfer-to-btn"
            onPress={() => setPickerFor("to")}
            style={styles.selectRow}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.selectText,
                  { color: toAcc ? theme.colors.onSurface : theme.colors.onSurfaceTertiary },
                ]}
              >
                {toAcc?.name || "Select destination"}
              </Text>
              {toAcc && (
                <Text style={styles.selectSub}>Balance {fmtMoney(toAcc.balance)}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceTertiary} />
          </Pressable>
        </Field>

        <Field label="Description">
          <TextInput
            testID="xfer-description"
            value={description}
            onChangeText={setDescription}
            style={styles.textInput}
            placeholder="Optional"
            placeholderTextColor={theme.colors.onSurfaceTertiary}
          />
        </Field>

        <Field label="Date">
          <TextInput
            testID="xfer-date"
            value={date}
            onChangeText={setDate}
            style={styles.textInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.colors.onSurfaceTertiary}
          />
        </Field>

        {fromId && toId && fromId === toId && (
          <Text style={styles.warn}>From and To must be different accounts</Text>
        )}

        <Pressable
          testID="xfer-save"
          onPress={save}
          style={[styles.saveBtn, !valid && { opacity: 0.5 }]}
        >
          <Text style={styles.saveBtnText}>Transfer</Text>
        </Pressable>
      </ScrollView>

      <Modal
        transparent
        visible={!!pickerFor}
        animationType="slide"
        onRequestClose={() => setPickerFor(null)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setPickerFor(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>
              Select {pickerFor === "from" ? "source" : "destination"} account
            </Text>
            <FlatList
              data={accounts}
              keyExtractor={(a) => a.id}
              renderItem={({ item }) => (
                <Pressable
                  testID={`xfer-opt-${item.id}`}
                  onPress={() => {
                    if (pickerFor === "from") setFromId(item.id);
                    else setToId(item.id);
                    setPickerFor(null);
                  }}
                  style={styles.opt}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optText}>{item.name}</Text>
                    <Text style={styles.optSub}>{item.group} · {fmtMoney(item.balance)}</Text>
                  </View>
                </Pressable>
              )}
              ItemSeparatorComponent={() => (
                <View style={{ height: 1, backgroundColor: theme.colors.divider }} />
              )}
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
  selectSub: {
    fontFamily: theme.font.text,
    fontSize: 11,
    color: theme.colors.onSurfaceTertiary,
    marginTop: 2,
  },
  warn: {
    color: theme.colors.error,
    fontFamily: theme.font.text,
    fontSize: 13,
    marginBottom: theme.spacing.md,
  },
  saveBtn: {
    marginTop: theme.spacing.md,
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
  opt: { paddingVertical: theme.spacing.md },
  optText: { fontFamily: theme.font.text, fontSize: 15, color: theme.colors.onSurface },
  optSub: {
    fontFamily: theme.font.text,
    fontSize: 11,
    color: theme.colors.onSurfaceTertiary,
    marginTop: 2,
  },
});

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "@/src/theme";
import { api } from "@/src/api";

const GROUPS = ["Cash", "Registered", "Investment", "Crypto", "Other"];

export default function AccountEditor() {
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    group?: string;
    balance?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isEdit = !!params.id;

  const [name, setName] = useState(params.name || "");
  const [group, setGroup] = useState(params.group || "Cash");
  const [balance, setBalance] = useState(params.balance || "");

  const save = async () => {
    const bal = parseFloat(balance);
    if (!name.trim() || isNaN(bal)) return;
    if (isEdit) {
      await api.updateAccount(params.id!, { name, group, balance: bal });
    } else {
      await api.createAccount({ name, group, balance: bal, brought_forward: bal });
    }
    router.back();
  };

  const del = async () => {
    if (params.id) await api.deleteAccount(params.id);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="acc-close" onPress={() => router.back()}>
          <Ionicons name="close" size={26} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>{isEdit ? "Edit" : "New"} account</Text>
        {isEdit ? (
          <Pressable testID="acc-delete" onPress={del}>
            <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
          </Pressable>
        ) : (
          <View style={{ width: 26 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 120 }}>
        <Field label="Account name">
          <TextInput
            testID="acc-name"
            value={name}
            onChangeText={setName}
            style={styles.textInput}
            placeholder="e.g. Chequing"
            placeholderTextColor={theme.colors.onSurfaceTertiary}
            autoFocus={!isEdit}
          />
        </Field>

        <Field label="Group">
          <View style={styles.chipRow}>
            {GROUPS.map((g) => (
              <Pressable
                key={g}
                testID={`acc-group-${g}`}
                onPress={() => setGroup(g)}
                style={[styles.chip, group === g && styles.chipActive]}
              >
                <Text
                  style={[
                    styles.chipText,
                    group === g && styles.chipTextActive,
                  ]}
                >
                  {g}
                </Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Field label="Balance">
          <TextInput
            testID="acc-balance"
            value={balance}
            onChangeText={setBalance}
            keyboardType="decimal-pad"
            style={styles.textInput}
            placeholder="0.00"
            placeholderTextColor={theme.colors.onSurfaceTertiary}
          />
        </Field>

        <Pressable
          testID="acc-save"
          onPress={save}
          style={[styles.saveBtn, (!name || !balance) && { opacity: 0.5 }]}
        >
          <Text style={styles.saveBtnText}>{isEdit ? "Save changes" : "Add account"}</Text>
        </Pressable>
      </ScrollView>
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

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive: {
    backgroundColor: theme.colors.brandSecondary,
    borderColor: theme.colors.brandPrimary,
  },
  chipText: { fontFamily: theme.font.text, fontSize: 13, color: theme.colors.onSurfaceTertiary },
  chipTextActive: { color: theme.colors.onBrandSecondary },

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
});

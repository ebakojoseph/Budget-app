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
import { api, TxType, currentMonth } from "@/src/api";

export default function CategoryEditor() {
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    planned?: string;
    type?: TxType;
    month?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isEdit = !!params.id;
  const month = (params.month as string) || currentMonth();

  const [name, setName] = useState(params.name || "");
  const [planned, setPlanned] = useState(params.planned || "");
  const [type, setType] = useState<TxType>((params.type as TxType) || "expense");

  const save = async () => {
    const p = parseFloat(planned);
    if (!name.trim() || isNaN(p) || p < 0) return;
    if (isEdit) {
      await api.updateCategory(params.id!, { name, planned: p });
    } else {
      await api.createCategory({ name, type, planned: p, month });
    }
    router.back();
  };

  const del = async () => {
    if (params.id) await api.deleteCategory(params.id);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="cat-close" onPress={() => router.back()}>
          <Ionicons name="close" size={26} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>{isEdit ? "Edit" : "New"} category</Text>
        {isEdit ? (
          <Pressable testID="cat-delete" onPress={del}>
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
              testID="cat-type-expense"
              style={[styles.segment, type === "expense" && styles.segmentActive]}
              onPress={() => setType("expense")}
            >
              <Text style={[styles.segmentText, type === "expense" && styles.segmentTextActive]}>
                Expense
              </Text>
            </Pressable>
            <Pressable
              testID="cat-type-income"
              style={[styles.segment, type === "income" && styles.segmentActive]}
              onPress={() => setType("income")}
            >
              <Text style={[styles.segmentText, type === "income" && styles.segmentTextActive]}>
                Income
              </Text>
            </Pressable>
          </View>
        )}

        <Field label="Category name">
          <TextInput
            testID="cat-name"
            value={name}
            onChangeText={setName}
            style={styles.textInput}
            placeholder="e.g. Groceries"
            placeholderTextColor={theme.colors.onSurfaceTertiary}
            autoFocus={!isEdit}
          />
        </Field>

        <Field label="Planned amount">
          <TextInput
            testID="cat-planned"
            value={planned}
            onChangeText={setPlanned}
            keyboardType="decimal-pad"
            style={styles.textInput}
            placeholder="0.00"
            placeholderTextColor={theme.colors.onSurfaceTertiary}
          />
        </Field>

        <Pressable
          testID="cat-save"
          onPress={save}
          style={[styles.saveBtn, (!name || !planned) && { opacity: 0.5 }]}
        >
          <Text style={styles.saveBtnText}>{isEdit ? "Save changes" : "Add category"}</Text>
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

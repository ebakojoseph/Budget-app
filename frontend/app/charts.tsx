import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LineChart, BarChart, PieChart } from "react-native-gifted-charts";

import { theme } from "@/src/theme";
import { api, fmtMoney, fmtMonthShort } from "@/src/api";

const COLORS = [
  "#4B6955", "#7A9985", "#B7A16E", "#AA4235", "#5D635E",
  "#3A6044", "#B37A2C", "#8B5E3C", "#4A6B7A",
];

export default function ChartsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const width = Dimensions.get("window").width;

  useEffect(() => {
    api.getCharts().then((d: any) => {
      setData(d);
      setLoading(false);
    }).catch((e) => {
      console.log("charts error", e);
      setLoading(false);
    });
  }, []);

  const netWorthPoints = (data?.net_worth_series || []).map((p: any, i: number) => ({
    value: p.value,
    label: fmtMonthShort(p.month),
    labelTextStyle: { color: theme.colors.onSurfaceTertiary, fontSize: 10 },
    dataPointColor: theme.colors.brandPrimary,
  }));

  const spendingPie = (data?.spending_by_category || []).slice(0, 8).map((s: any, i: number) => ({
    value: s.value,
    color: COLORS[i % COLORS.length],
    text: `${Math.round((s.value / Math.max(1, (data?.spending_by_category || []).reduce((sum: number, x: any) => sum + x.value, 0))) * 100)}%`,
    label: s.label,
  }));

  const plannedVsActual = (data?.planned_vs_actual || [])
    .filter((c: any) => c.planned > 0 || c.actual > 0)
    .slice(0, 10);

  const barData: any[] = [];
  plannedVsActual.forEach((c: any) => {
    barData.push({
      value: c.planned,
      label: c.label.length > 8 ? c.label.slice(0, 8) + "…" : c.label,
      spacing: 2,
      labelWidth: 60,
      frontColor: theme.colors.brandTertiary,
      labelTextStyle: { color: theme.colors.onSurfaceTertiary, fontSize: 9 },
    });
    barData.push({
      value: c.actual,
      frontColor: theme.colors.brandPrimary,
    });
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="charts-back" onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Charts & Insights</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.brandPrimary} />
        ) : (
          <>
            <Section title="Net worth over time" subtitle="From your month-end account snapshots">
              {netWorthPoints.length > 1 ? (
                <LineChart
                  data={netWorthPoints}
                  areaChart
                  startFillColor={theme.colors.brandPrimary}
                  endFillColor={theme.colors.brandTertiary}
                  startOpacity={0.5}
                  endOpacity={0.05}
                  color={theme.colors.brandPrimary}
                  thickness={2}
                  hideRules
                  yAxisTextStyle={{ color: theme.colors.onSurfaceTertiary, fontSize: 10 }}
                  yAxisColor={theme.colors.border}
                  xAxisColor={theme.colors.border}
                  height={180}
                  spacing={Math.max(40, (width - 80) / Math.max(2, netWorthPoints.length - 1))}
                  initialSpacing={20}
                  noOfSections={3}
                />
              ) : (
                <EmptyChart
                  icon="analytics-outline"
                  text="Enter month-end balances on accounts to build history."
                />
              )}
            </Section>

            <Section title="Spending by category" subtitle={`For ${data?.latest_month || "current"} month`}>
              {spendingPie.length > 0 ? (
                <View style={styles.pieWrap}>
                  <PieChart
                    data={spendingPie}
                    donut
                    radius={90}
                    innerRadius={55}
                    innerCircleColor={theme.colors.surfaceSecondary}
                    centerLabelComponent={() => (
                      <View style={{ alignItems: "center" }}>
                        <Text style={styles.centerLbl}>Spent</Text>
                        <Text style={styles.centerVal}>
                          {fmtMoney(
                            spendingPie.reduce((s: number, p: any) => s + p.value, 0),
                          )}
                        </Text>
                      </View>
                    )}
                  />
                  <View style={styles.legend}>
                    {spendingPie.map((s: any, i: number) => (
                      <View key={i} style={styles.legendRow}>
                        <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                        <Text style={styles.legendText} numberOfLines={1}>
                          {s.label}
                        </Text>
                        <Text style={styles.legendVal}>{fmtMoney(s.value)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <EmptyChart icon="pie-chart-outline" text="Add expense transactions to see breakdown." />
              )}
            </Section>

            <Section title="Planned vs Actual" subtitle="Top expense categories">
              {barData.length > 0 ? (
                <>
                  <View style={styles.legendRowInline}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: theme.colors.brandTertiary }]} />
                      <Text style={styles.legendText}>Planned</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: theme.colors.brandPrimary }]} />
                      <Text style={styles.legendText}>Actual</Text>
                    </View>
                  </View>
                  <BarChart
                    data={barData}
                    height={180}
                    barWidth={16}
                    hideRules
                    yAxisTextStyle={{ color: theme.colors.onSurfaceTertiary, fontSize: 10 }}
                    yAxisColor={theme.colors.border}
                    xAxisColor={theme.colors.border}
                    noOfSections={3}
                    initialSpacing={10}
                  />
                </>
              ) : (
                <EmptyChart icon="bar-chart-outline" text="Add categories and transactions to compare." />
              )}
            </Section>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSub}>{subtitle}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function EmptyChart({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.emptyChart}>
      <Ionicons name={icon} size={26} color={theme.colors.onSurfaceTertiary} />
      <Text style={styles.emptyChartText}>{text}</Text>
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
  headerTitle: {
    fontFamily: theme.font.display,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
  },
  sectionTitle: {
    fontFamily: theme.font.display,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  sectionSub: {
    fontFamily: theme.font.text,
    fontSize: 12,
    color: theme.colors.onSurfaceTertiary,
    marginTop: 2,
    marginBottom: theme.spacing.md,
  },
  sectionCard: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  pieWrap: {
    alignItems: "center",
  },
  centerLbl: {
    fontFamily: theme.font.text,
    fontSize: 11,
    color: theme.colors.onSurfaceTertiary,
  },
  centerVal: {
    fontFamily: theme.font.numeric,
    fontSize: 14,
    color: theme.colors.onSurface,
    marginTop: 2,
  },
  legend: {
    width: "100%",
    marginTop: theme.spacing.lg,
    gap: 6,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendRowInline: {
    flexDirection: "row",
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: {
    flex: 1,
    fontFamily: theme.font.text,
    fontSize: 12,
    color: theme.colors.onSurface,
  },
  legendVal: {
    fontFamily: theme.font.numeric,
    fontSize: 12,
    color: theme.colors.onSurface,
  },
  emptyChart: {
    alignItems: "center",
    padding: theme.spacing.xl,
    gap: 8,
  },
  emptyChartText: {
    fontFamily: theme.font.text,
    fontSize: 12,
    color: theme.colors.onSurfaceTertiary,
    textAlign: "center",
  },
});

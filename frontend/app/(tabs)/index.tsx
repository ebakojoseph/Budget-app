import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { currentMonth } from "@/src/api";

export default function Dashboard() {
  const month = currentMonth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Current Month: {month}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 20,
  },
});

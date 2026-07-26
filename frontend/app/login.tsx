import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const navigation = useNavigation();

  const androidClientId = process.env.ANDROID_CLIENT_ID;
  const expoClientId = process.env.EXPO_CLIENT_ID;

  // Google OAuth
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId,
    expoClientId,
  });

  // Handle Google login result
  React.useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      navigation.replace("Home");
    }
  }, [response]);

  // Skip login (dev only)
  const skipLogin = () => {
    navigation.replace("Home");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>

      <Button
        title="Sign in with Google"
        onPress={() => promptAsync()}
        disabled={!request}
      />

      {__DEV__ && (
        <View style={{ marginTop: 20 }}>
          <Button title="Skip for now" onPress={skipLogin} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    marginBottom: 40,
    textAlign: "center",
  },
});

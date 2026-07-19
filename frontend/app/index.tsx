import { View, ActivityIndicator } from "react-native";
import { colors } from "@/src/theme";

// Placeholder; Gate in _layout redirects to /(auth)/login or /(tabs)/home.
export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
      <ActivityIndicator color={colors.brandPrimary} />
    </View>
  );
}

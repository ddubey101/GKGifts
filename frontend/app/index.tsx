import { Redirect } from "expo-router";

// The landing page is the shop itself — no login required.
export default function Index() {
  return <Redirect href="/(tabs)/home" />;
}

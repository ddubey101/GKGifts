import AsyncStorage from "@react-native-async-storage/async-storage";

import { api } from "./api";

const VISITOR_ID_KEY = "gk_visitor_id";

function createVisitorId(): string {
  const random = Math.random().toString(36).slice(2);
  return `visitor_${Date.now().toString(36)}_${random}`;
}

export async function trackVisitor(): Promise<void> {
  let visitorId = await AsyncStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = createVisitorId();
    await AsyncStorage.setItem(VISITOR_ID_KEY, visitorId);
  }

  await api("/visitors/track", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ visitor_id: visitorId }),
  });
}

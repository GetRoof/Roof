import { View, Pressable, Text, StyleSheet } from "react-native";
import { useState } from "react";
import { Menu } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { simulatePress } from "@/src/shared/lib/utils/simulate-press";
import { WithPullToRefresh } from "@/src/shared/components/with-pull-to-refresh";
import { ListItem } from "../components/list-item";
import Animated from "react-native-reanimated";
import LoadingIndicator from "../components/loading-indicator";

const Home = () => {
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setRefreshing(false);
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View
        className="px-4"
        style={{
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: "grey",
        }}
      >
        <View className="mx-3 py-3 flex-row gap-6 items-center justify-between">
          <Pressable className="items-center justify-center" onPress={simulatePress}>
            <Menu size={24} color="grey" />
          </Pressable>

          <View className="flex-1 rounded-full border border-orange-400 flex-row items-center p-2">
            <View className="size-8 rounded-full bg-[#FF4400]" />
            <Text className="absolute inset-x-0 text-center text-base text-neutral-500">
              Find anything
            </Text>
          </View>

          <Pressable onPress={simulatePress}>
            <Text className="font-semibold text-neutral-700">Log in</Text>
          </Pressable>
        </View>

        <View className="flex-row my-4 gap-2">
          <View className="w-20 h-8 bg-neutral-200 rounded-lg" />
          <View className="w-20 h-8 bg-neutral-200 rounded-lg" />
          <View className="w-20 h-8 bg-neutral-200 rounded-lg" />
        </View>
      </View>

      {/* reddit-pull-to-refresh-loading-animation 🔽 */}
      <WithPullToRefresh
        refreshing={refreshing}
        refreshComponent={<LoadingIndicator />}
        // Neutral background matches Reddit's design; justify-start aligns indicator to top
        // overflow-hidden prevents indicator from spilling outside container during animations
        refreshComponentContainerClassName="bg-neutral-50 justify-start overflow-hidden"
        // Threshold: 160px pull distance triggers refresh
        // Tuned to match visual indicator reveal timing (logo fully visible)
        refreshThreshold={160}
        // Base height: 85px keeps indicator visible during refresh
        // Sized to fit logo (80px) + small padding, matches ANIMATED_SVG_HEIGHT
        refreshViewBaseHeight={85}
        // Haptic feedback only on downward pulls (more natural UX)
        hapticFeedbackDirection="to-bottom"
        onRefresh={refresh}
      >
        {/* Animated.FlatList required: enables scroll event tracking on UI thread
            Regular FlatList won't work - needs Reanimated's animated component for gesture coordination */}
        <Animated.FlatList
          data={Array.from({ length: 10 })}
          keyExtractor={(item, index) => `${item}-${index}`}
          renderItem={() => <ListItem />}
          ItemSeparatorComponent={() => (
            <View
              style={{
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: "grey",
              }}
            />
          )}
          showsVerticalScrollIndicator={false}
          // Disable scrolling during refresh to prevent gesture conflicts
          scrollEnabled={!refreshing}
          contentContainerStyle={{ paddingBottom: insets.bottom + 12 }}
        />
      </WithPullToRefresh>
      {/* reddit-pull-to-refresh-loading-animation 🔼 */}
    </View>
  );
};
export default Home;

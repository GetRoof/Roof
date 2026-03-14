import { FlatList } from "react-native";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import CustomCellRendererComponent from "../components/custom-cell-renderer-component";
import { UpcomingItem } from "../components/upcoming-item";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// showcase-upcoming-list-scroll-animation 🔽

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

// Demo data - 20 placeholder items for testing scroll animations
const data = Array.from({ length: 20 });

export function Upcoming() {
  const insets = useSafeAreaInsets();

  // Shared scroll position value - drives all item animations
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });

  return (
    <AnimatedFlatList
      data={data}
      keyExtractor={(_, index) => index.toString()}
      // Custom cell renderer provides itemY position to each item
      CellRendererComponent={CustomCellRendererComponent}
      renderItem={({ item, index }) => {
        return <UpcomingItem item={item} index={index} scrollY={scrollY} />;
      }}
      onScroll={onScroll}
      scrollEventThrottle={16} // 60fps animation updates
      className="bg-black"
      contentContainerStyle={{
        paddingBottom: insets.bottom + 8,
      }}
      showsVerticalScrollIndicator={false}
      // Essential for iOS large title animation coordination
      contentInsetAdjustmentBehavior="automatic"
    />
  );
}

// showcase-upcoming-list-scroll-animation 🔼

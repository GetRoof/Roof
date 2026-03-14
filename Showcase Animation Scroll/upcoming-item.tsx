import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import Animated, { interpolate, useAnimatedProps, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// showcase-upcoming-list-scroll-animation 🔽

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

// Fixed item height for consistent scroll calculations
const ITEM_HEIGHT = 170;

export const UpcomingItem = ({ index, scrollY, itemY }: any) => {
  const insets = useSafeAreaInsets();

  const headerHeight = Platform.OS === "ios" ? insets.top + 45 : 0;

  // Main animation style - handles both translation and scaling during scroll
  const rContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          // Subtle upward translation effect when item approaches viewport top
          translateY: interpolate(
            scrollY.value,
            [
              itemY.value - index - 1 - headerHeight, // Before animation zone
              itemY.value - index - headerHeight, // Animation start point
              itemY.value - index + 1 - headerHeight, // Animation end point
            ],
            [0, 0, 1] // No translation → No translation → 1px down
          ),
        },
        {
          // Scale down effect as item scrolls past viewport (0.9x when fully scrolled)
          scale: interpolate(
            scrollY.value,
            [
              itemY.value - 1 - headerHeight, // Before animation zone
              itemY.value - headerHeight, // Animation start point
              itemY.value + ITEM_HEIGHT - headerHeight, // Animation end point
            ],
            [1, 1, 0.9] // No scale → No scale → 0.9x scale
          ),
        },
      ],
    };
  });

  // iOS-only blur effect that increases as item scrolls away
  const backdropAnimatedProps = useAnimatedProps(() => {
    // Blur intensity increases from 0 to 15 as item exits viewport
    const intensity = interpolate(
      scrollY.value,
      [
        itemY.value - 1 - headerHeight, // Before animation zone
        itemY.value - headerHeight, // Animation start point
        itemY.value + ITEM_HEIGHT - headerHeight, // Animation end point
      ],
      [0, 0, 15] // No blur → No blur → 15 blur
    );

    return {
      intensity,
    };
  });

  return (
    <Animated.View
      className="w-full items-center px-4 py-[5px] overflow-hidden"
      style={[rContainerStyle, styles.container]}
    >
      <View className="flex-1 p-2 flex-row gap-2 bg-neutral-800 rounded-3xl border border-neutral-700/15">
        <View className="pt-4 px-2 gap-3 items-center">
          <View className="w-10 h-8 bg-yellow-200/75 rounded-xl" />
          <View className="w-8 h-3 rounded-full bg-neutral-700" />
        </View>
        <View className="flex-1 bg-neutral-900/50 rounded-2xl" style={styles.imageContainer} />
      </View>
      {/* iOS-only: Dark blur overlay for depth effect during scroll */}
      {Platform.OS === "ios" && (
        <AnimatedBlurView
          style={StyleSheet.absoluteFill}
          tint="dark"
          animatedProps={backdropAnimatedProps}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: ITEM_HEIGHT,
    borderCurve: "continuous",
  },
  imageContainer: {
    borderCurve: "continuous",
  },
});

// showcase-upcoming-list-scroll-animation 🔼

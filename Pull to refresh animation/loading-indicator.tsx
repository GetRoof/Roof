import { useEffect, useRef } from "react";
import { usePullToRefresh } from "@/src/shared/components/with-pull-to-refresh";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { interpolatePath, parse } from "react-native-redash";
import LottieView from "lottie-react-native";
import CakeRunner from "@/assets/lottie/cakerun.json";
import { useWindowDimensions, StyleSheet } from "react-native";

// reddit-pull-to-refresh-loading-animation 🔽

// Base size for the orange circle that scales up during refresh completion
// Matches Lottie animation dimensions for visual alignment
const SCALE_VIEW_SIZE = 55;

// Wrap SVG components with Reanimated to enable animated props
// createAnimatedComponent bridges React Native components to Reanimated's worklet system
// See: https://docs.swmansion.com/react-native-reanimated/docs/core/createAnimatedComponent
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedSvg = Animated.createAnimatedComponent(Svg);

// SVG path vectors for Reddit logo morphing animation
// PATH_VECTOR_1: Initial state (logo at top position)
// PATH_VECTOR_2: Final state (logo becomes rounded)
// interpolatePath smoothly transitions between these paths during pull
const PATH_VECTOR_1 = parse(
  "M101.5 51.012C101.5 23.115 78.89.5 51 .5S.5 23.115.5 51.012V115c0 14.012 5.707 26.701 14.919 35.851l-9.46 9.381-.034.034-.026.039c-.758 1.101-1.168 2.248-.868 3.247.314 1.043 1.32 1.682 2.807 1.94l.042.008h43.126c27.89 0 50.494-22.592 50.494-50.488v-64Z"
);
const PATH_VECTOR_2 = parse(
  "M 101.5 115.012 C 101.5 87.115 78.89 64.5 51 64.5 S 0.5 87.115 0.5 115.012 V 116 c 0 14.012 5.707 26.701 14.919 35.851 l -9.46 9.381 l -0.034 0.034 l -0.026 0.039 c -0.758 1.101 -1.168 2.248 -0.868 3.247 c 0.314 1.043 1.32 1.682 2.807 1.94 l 0.042 0.008 h 43.126 c 27.89 0 50.494 -22.592 50.494 -50.488 v -1 Z"
);

// SVG container dimensions - sized to fit logo with padding
// Height matches refreshViewBaseHeight (85px) minus small offset for positioning
const ANIMATED_SVG_HEIGHT = 80;
const ANIMATED_SVG_WIDTH = 70;

const LoadingIndicator = () => {
  const { width: screenWidth } = useWindowDimensions();

  const lottieAnimationRef = useRef<LottieView>(null);

  // Access pull-to-refresh context values from WithPullToRefresh HOC
  // refreshProgress: normalized 0-1 value based on pull distance
  // hasRefreshed: flag set when refresh completes (used for scale-out animation)
  const { refreshing, hasRefreshed, refreshProgress } = usePullToRefresh();

  // Controls SVG path morphing: 0 = initial path, 1 = final path
  // Triggered when refreshProgress reaches 1 (threshold crossed)
  const pathProgress = useSharedValue(0);
  // Prevents re-triggering path animation on subsequent progress updates
  const hasTriggeredPathAnimation = useSharedValue(false);
  // Subtle pulsing scale during refresh (1.01 -> 0.99) for breathing effect
  const svgScale = useSharedValue(1);

  // Start/stop animations when refresh state changes
  // Runs on JS thread to control Lottie (native component) and initialize Reanimated values
  useEffect(() => {
    if (refreshing) {
      // Play cake runner Lottie animation at 1.5x speed
      lottieAnimationRef.current?.play();
      // Start pulsing scale animation: 1.01 -> 0.99 over 200ms, repeat infinitely
      // Creates subtle breathing effect during refresh
      svgScale.set(
        withRepeat(
          withSequence(withTiming(1.01, { duration: 200 }), withTiming(0.99, { duration: 200 })),
          -1,
          false
        )
      );
    } else {
      // Reset Lottie to first frame and stop pulsing
      lottieAnimationRef.current?.reset();
      svgScale.set(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshing]);

  // Trigger path morphing animation when threshold is crossed
  // Runs on UI thread via useDerivedValue for smooth 60fps updates
  useDerivedValue(() => {
    // When pull distance reaches threshold (progress = 1), morph logo down
    // High stiffness (1500) + low damping (20) = quick, snappy spring animation
    if (refreshProgress.get() >= 1 && !hasTriggeredPathAnimation.get()) {
      hasTriggeredPathAnimation.set(true);
      pathProgress.set(withSpring(1, { stiffness: 1500, damping: 20, mass: 1 }));
    }

    // Reset path when user releases early (progress < 0.1)
    // Allows re-triggering if user pulls again
    if (refreshProgress.get() < 0.1) {
      hasTriggeredPathAnimation.set(false);
      pathProgress.set(0);
    }
  });

  // Animate container reveal: starts hidden above viewport, slides down as user pulls
  // Interpolation: refreshProgress [0, 1] -> translateY [-80, 0]
  // CLAMP prevents overshooting when user over-pulls beyond threshold
  const rOuterContainerStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      refreshProgress.get(),
      [0, 1],
      [-ANIMATED_SVG_HEIGHT, 0],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        {
          translateY,
        },
      ],
    };
  });

  // Morph SVG path from initial to final state based on pathProgress
  // interpolatePath smoothly transitions path coordinates between two vectors
  // Progress [0, 1] maps to path [PATH_VECTOR_1, PATH_VECTOR_2]
  // Creates smooth logo shift animation when threshold is crossed
  const svgAnimatedProps = useAnimatedProps(() => {
    const d = interpolatePath(pathProgress.get(), [0, 1], [PATH_VECTOR_1, PATH_VECTOR_2]);
    return {
      d,
    };
  });

  // Apply pulsing scale animation during refresh
  // Subtle 1% scale variation creates breathing effect without being distracting
  const rSvgScaleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: svgScale.get() }],
    };
  });

  // Scale-out animation when refresh completes
  // Calculates scale to fill 120% of screen width, creating dramatic exit effect
  // Timing: 150ms with ease-out for quick, smooth expansion
  // Only triggers when hasRefreshed transitions to true (refresh cycle complete)
  const rScaleView = useAnimatedStyle(() => {
    const scaleValue = (screenWidth * 1.2) / SCALE_VIEW_SIZE;

    return {
      transform: [
        {
          scale: withTiming(hasRefreshed.get() ? scaleValue : 1, {
            duration: 150,
            easing: Easing.out(Easing.ease),
          }),
        },
      ],
    };
  });

  return (
    <>
      {/* Main container: slides down from above viewport as user pulls */}
      <Animated.View
        className="items-center"
        style={[rOuterContainerStyle, { transformOrigin: "bottom" }]}
      >
        {/* Orange circle: scales out dramatically when refresh completes */}
        <Animated.View
          className="absolute top-3 rounded-full bg-[#FF4400]"
          style={[styles.scaleView, rScaleView]}
        />
        {/* Reddit logo SVG: morphs path and pulses during refresh */}
        <AnimatedSvg
          style={rSvgScaleStyle}
          width={ANIMATED_SVG_WIDTH}
          height={ANIMATED_SVG_HEIGHT}
          viewBox={"0 35 105 45"}
          fill="none"
        >
          <AnimatedPath animatedProps={svgAnimatedProps} fill="#FF4400" />
        </AnimatedSvg>
      </Animated.View>
      {/* Cake runner Lottie: plays during refresh, positioned above logo */}
      <LottieView
        ref={lottieAnimationRef}
        source={CakeRunner}
        speed={1.5}
        loop
        style={{
          position: "absolute",
          top: 12,
          width: 55,
          height: 55,
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  scaleView: {
    width: SCALE_VIEW_SIZE,
    height: SCALE_VIEW_SIZE,
  },
});

export default LoadingIndicator;

// reddit-pull-to-refresh-loading-animation 🔼

import { Children, cloneElement, isValidElement, memo } from "react";
import { useSharedValue } from "react-native-reanimated";
import { View } from "react-native";

// showcase-upcoming-list-scroll-animation 🔽

/**
 * Custom cell renderer that provides each item with its Y position in the list.
 * This enables position-aware animations based on scroll and item location.
 */
const Component = memo(({ children, ...props }: any) => {
  // Tracks this cell's Y position for animation calculations
  const itemY = useSharedValue(0);

  return (
    <View
      {...props}
      onLayout={(e) => {
        // Update position when cell layout changes
        itemY.set(e.nativeEvent.layout.y);
      }}
    >
      {/* Inject itemY prop into each child component for position-aware animations */}
      {Children.map(children, (child) => {
        if (isValidElement(child)) {
          return cloneElement(child, { itemY } as any);
        }
        return child;
      })}
    </View>
  );
});

Component.displayName = "CustomCellRendererComponent";

export default Component;

// showcase-upcoming-list-scroll-animation 🔼

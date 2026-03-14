import { Ellipsis } from "lucide-react-native";
import { View, StyleSheet } from "react-native";

/**
 * ListItem component for rendering individual Reddit post items in the feed
 */
export const ListItem = () => {
  return (
    <View className="px-4">
      <View className="flex-row justify-between items-center my-2">
        <View className="w-24 h-4 bg-neutral-200 rounded-full" />
        <Ellipsis size={18} color="grey" />
      </View>
      <View
        style={{
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: "grey",
        }}
      />
      <View className="w-36 h-4 bg-neutral-200 rounded-full mt-3" />
      <View className="h-72 w-full rounded-3xl bg-neutral-200 my-3" />
    </View>
  );
};

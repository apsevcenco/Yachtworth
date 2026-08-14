import { Feather } from "@expo/vector-icons";
import React, { useRef } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from "react-native";
import { Swipeable } from "react-native-gesture-handler";

const IVORY = "#F7F3EC";
const DANGER = "#B5363A";

export interface SwipeableCardProps {
  children: React.ReactNode;
  onDelete: () => void;
  deletingLabel: string;
  confirmTitle: string;
  confirmMessage: string;
  isDeleting: boolean;
}

/**
 * A card row that reveals a destructive "Delete" action when swiped left.
 * Deletion always goes through a confirm Alert. Shared by the History tab and
 * the Charter ROI screen so both delete saved records with the same UX.
 */
export function SwipeableCard({
  children,
  onDelete,
  deletingLabel,
  confirmTitle,
  confirmMessage,
  isDeleting,
}: SwipeableCardProps) {
  const swipeRef = useRef<Swipeable>(null);
  const handlePress = () => {
    Alert.alert(confirmTitle, confirmMessage, [
      { text: "Cancel", style: "cancel", onPress: () => swipeRef.current?.close() },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          swipeRef.current?.close();
          onDelete();
        },
      },
    ]);
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={() => (
        <Pressable
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={deletingLabel}
          disabled={isDeleting}
          style={({ pressed }) => [
            styles.deleteAction,
            { opacity: pressed || isDeleting ? 0.7 : 1 },
          ]}
        >
          {isDeleting ? (
            <ActivityIndicator color={IVORY} />
          ) : (
            <>
              <Feather name="trash-2" size={18} color={IVORY} />
              <Text style={styles.deleteActionText}>Delete</Text>
            </>
          )}
        </Pressable>
      )}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  deleteAction: {
    backgroundColor: DANGER,
    justifyContent: "center",
    alignItems: "center",
    width: 92,
    marginBottom: 10,
    borderRadius: 14,
    marginLeft: 8,
    gap: 4,
  },
  deleteActionText: {
    color: IVORY,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
});

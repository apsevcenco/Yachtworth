/**
 * TemplatePickerSheet
 * Bottom sheet for choosing a Vessel Proposal template.
 * Usage: drop into app/yacht-proposal/ and call from the proposal screen.
 *
 * Props:
 *   visible       - controls visibility
 *   onSelect(t)   - called with chosen ProposalTemplate
 *   onClose()     - called on dismiss
 */

import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
  Platform,
} from "react-native";
import type { ProposalTemplate } from "../lib/proposalPdf";

const { height: SCREEN_H } = Dimensions.get("window");

interface Template {
  id: ProposalTemplate;
  name: string;
  tagline: string;
  // Cover preview colours
  photoBg: string;
  pageBg: string;
  nameColor: string;
  accentColor: string;
  labelColor: string;
  priceColor: string;
  dividerColor: string;
  // Classic split
  splitPanel?: boolean;
  splitBg?: string;
}

const TEMPLATES: Template[] = [
  {
    id: "minimal",
    name: "Minimal",
    tagline: "Clean · White · Gold",
    photoBg: "#4a85b8",
    pageBg: "#ffffff",
    nameColor: "#1a1a1a",
    accentColor: "#C5973A",
    labelColor: "#888888",
    priceColor: "#1a1a1a",
    dividerColor: "#dddddd",
  },
  {
    id: "dark",
    name: "Dark Luxury",
    tagline: "Obsidian · Cream · Gold",
    photoBg: "#0e2235",
    pageBg: "#0D0D0D",
    nameColor: "#E8E0D0",
    accentColor: "#C5973A",
    labelColor: "#555555",
    priceColor: "#C5973A",
    dividerColor: "#2a2a2a",
  },
  {
    id: "classic",
    name: "Classic Blue",
    tagline: "Navy · Split cover",
    photoBg: "#5a8fbe",
    pageBg: "#ffffff",
    nameColor: "#ffffff",
    accentColor: "#1B3A6B",
    labelColor: "#4A6A9A",
    priceColor: "#ffffff",
    dividerColor: "#2E5491",
    splitPanel: true,
    splitBg: "#1B3A6B",
  },
];

interface Props {
  visible: boolean;
  selected?: ProposalTemplate;
  onSelect: (template: ProposalTemplate) => void;
  onClose: () => void;
}

export default function TemplatePickerSheet({
  visible,
  selected,
  onSelect,
  onClose,
}: Props) {
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_H,
        duration: 260,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle */}
        <View style={styles.handle} />

        {/* Title */}
        <Text style={styles.sheetTitle}>Choose Template</Text>
        <Text style={styles.sheetSubtitle}>
          All templates include the same content — only the visual style changes.
        </Text>

        {/* Template cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsRow}
          decelerationRate="fast"
          snapToInterval={CARD_W + 12}
          snapToAlignment="start"
        >
          {TEMPLATES.map((tmpl) => (
            <TemplateCard
              key={tmpl.id}
              tmpl={tmpl}
              isSelected={selected === tmpl.id}
              onPress={() => onSelect(tmpl.id)}
            />
          ))}
        </ScrollView>

        {/* Confirm */}
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            !selected && styles.confirmBtnDisabled,
          ]}
          onPress={() => {
            if (selected) onClose();
          }}
          activeOpacity={0.8}
          disabled={!selected}
        >
          <Text style={styles.confirmText}>
            {selected ? "Generate PDF" : "Select a template"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

// ─── TEMPLATE CARD ────────────────────────────────────────────────────────────

const CARD_W = 168;

function TemplateCard({
  tmpl,
  isSelected,
  onPress,
}: {
  tmpl: Template;
  isSelected: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function handlePress() {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start();
    onPress();
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1}>
      <Animated.View
        style={[
          styles.card,
          { transform: [{ scale: scaleAnim }] },
          isSelected && styles.cardSelected,
        ]}
      >
        {/* Mini cover preview */}
        <View style={[styles.preview, { backgroundColor: tmpl.pageBg }]}>
          {tmpl.splitPanel ? (
            // Classic: vertical split
            <View style={styles.previewSplit}>
              <View style={[styles.previewSplitLeft, { backgroundColor: tmpl.splitBg }]}>
                <View style={[styles.previewNameBar, { backgroundColor: "rgba(255,255,255,0.9)", width: "80%" }]} />
                <View style={[styles.previewNameBar, { backgroundColor: "rgba(255,255,255,0.5)", width: "60%", marginTop: 4 }]} />
                <View style={[styles.previewDivider, { backgroundColor: tmpl.dividerColor, marginTop: 6 }]} />
                <View style={[styles.previewPriceBar, { backgroundColor: "rgba(255,255,255,0.85)", width: "75%" }]} />
              </View>
              <View style={[styles.previewSplitRight, { backgroundColor: tmpl.photoBg }]}>
                {/* Gradient overlay simulation */}
                <View style={{ flex: 1, backgroundColor: "rgba(90,143,190,0.4)" }} />
                <View style={{ flex: 1, backgroundColor: "rgba(27,58,107,0.7)" }} />
              </View>
            </View>
          ) : (
            // Minimal / Dark: photo top
            <>
              <View style={[styles.previewPhoto, { backgroundColor: tmpl.photoBg }]}>
                {/* Simulated photo layers */}
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.15)" }} />
              </View>
              <View style={[styles.previewContent, { backgroundColor: tmpl.pageBg }]}>
                {/* Name */}
                <View
                  style={[
                    styles.previewNameBar,
                    { backgroundColor: tmpl.nameColor, opacity: 0.85, width: "75%" },
                  ]}
                />
                {/* Specs dots */}
                <View style={styles.previewSpecsRow}>
                  {[55, 35, 45, 40, 50].map((w, i) => (
                    <View
                      key={i}
                      style={[
                        styles.previewSpecDot,
                        { backgroundColor: tmpl.labelColor, width: w * 0.4 },
                      ]}
                    />
                  ))}
                </View>
                {/* Divider */}
                <View style={[styles.previewDivider, { backgroundColor: tmpl.dividerColor }]} />
                {/* Price */}
                <View
                  style={[
                    styles.previewPriceBar,
                    { backgroundColor: tmpl.priceColor, opacity: 0.9, width: "60%" },
                  ]}
                />
                {/* Brand */}
                <View
                  style={[
                    styles.previewBrandBar,
                    { backgroundColor: tmpl.accentColor, alignSelf: "flex-end" },
                  ]}
                />
              </View>
            </>
          )}
        </View>

        {/* Check badge */}
        {isSelected && (
          <View style={[styles.checkBadge, { backgroundColor: tmpl.accentColor }]}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
        )}

        {/* Labels */}
        <Text style={styles.cardName}>{tmpl.name}</Text>
        <Text style={styles.cardTagline}>{tmpl.tagline}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e0e0e0",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: "#888",
    paddingHorizontal: 20,
    marginBottom: 20,
    lineHeight: 18,
  },
  cardsRow: {
    paddingHorizontal: 20,
    gap: 12,
  },

  // Card
  card: {
    width: CARD_W,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "visible",
  },
  cardSelected: {
    borderColor: "#C5973A",
  },

  // Preview
  preview: {
    width: CARD_W,
    height: 220,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 8,
  },
  previewPhoto: {
    height: 120,
  },
  previewContent: {
    flex: 1,
    padding: 8,
    gap: 4,
  },
  previewNameBar: {
    height: 10,
    borderRadius: 3,
  },
  previewSpecsRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 2,
  },
  previewSpecDot: {
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
  },
  previewDivider: {
    height: 1,
    marginVertical: 4,
    opacity: 0.4,
  },
  previewPriceBar: {
    height: 14,
    borderRadius: 3,
  },
  previewBrandBar: {
    height: 5,
    width: 40,
    borderRadius: 2,
    marginTop: 4,
    opacity: 0.8,
  },

  // Classic split
  previewSplit: {
    flex: 1,
    flexDirection: "row",
  },
  previewSplitLeft: {
    width: "42%",
    padding: 10,
    gap: 0,
  },
  previewSplitRight: {
    flex: 1,
    overflow: "hidden",
  },

  // Check badge
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },

  cardName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    paddingHorizontal: 2,
  },
  cardTagline: {
    fontSize: 11,
    color: "#888",
    paddingHorizontal: 2,
    marginTop: 2,
  },

  // Confirm button
  confirmBtn: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: "#C5973A",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  confirmBtnDisabled: {
    backgroundColor: "#e0e0e0",
  },
  confirmText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
});

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

const INTRO_MS = 3600;
const FADE_MS = 520;

const introVideo = require("../assets/videos/yachtworth-intro.mp4");
const logo = require("../assets/images/logo-wordmark.png");

export function LaunchIntro() {
  const [visible, setVisible] = useState(true);
  const [closing, setClosing] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslate = useRef(new Animated.Value(12)).current;
  const videoUri = useMemo(() => Image.resolveAssetSource(introVideo)?.uri, []);
  const player = useVideoPlayer(introVideo, (p) => {
    p.loop = false;
    p.muted = true;
    p.play();
  });

  const close = () => {
    if (closing) return;
    setClosing(true);
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 900,
        delay: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslate, {
        toValue: 0,
        duration: 900,
        delay: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(close, INTRO_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <Animated.View pointerEvents="auto" style={[styles.overlay, { opacity }]}>
      {Platform.OS === "web" && videoUri ? (
        React.createElement("video", {
          src: videoUri,
          autoPlay: true,
          muted: true,
          playsInline: true,
          preload: "auto",
          onEnded: close,
          onError: close,
          style: styles.video as unknown as React.CSSProperties,
        })
      ) : (
          <VideoView
            player={player}
            style={styles.video}
            contentFit="cover"
            nativeControls={false}
          />
      )}
      <View style={styles.scrim} />
      <Pressable accessibilityRole="button" accessibilityLabel="Skip intro" onPress={close} style={styles.content}>
        <Animated.Image
          source={logo}
          resizeMode="contain"
          style={[
            styles.logo,
            {
              opacity: logoOpacity,
              transform: [{ translateY: logoTranslate }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.rule,
            {
              opacity: logoOpacity,
              transform: [{ translateY: logoTranslate }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.captionWrap,
            {
              opacity: logoOpacity,
              transform: [{ translateY: logoTranslate }],
            },
          ]}
        >
          <Text style={styles.caption}>Yacht intelligence, beautifully measured</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: "#06142C",
  },
  video: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#06142C",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6,20,44,0.36)",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 38,
  },
  logo: {
    width: "76%",
    maxWidth: 360,
    height: 76,
  },
  rule: {
    width: 96,
    height: 1,
    marginTop: 22,
    marginBottom: 18,
    backgroundColor: "#C9A961",
  },
  captionWrap: {
    paddingHorizontal: 18,
  },
  caption: {
    color: "rgba(247,243,236,0.84)",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    letterSpacing: 1.2,
    textAlign: "center",
    textTransform: "uppercase",
  },
});

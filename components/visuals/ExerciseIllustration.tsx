import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Image } from 'expo-image'

interface Props {
  exerciseId?: string
  exerciseName?: string
  imageUrl?: string
  gifUrl?: string
  size?: number
  variant?: 'circle-thumb' | 'large-banner' | 'card'
  highlightColor?: string
  useAnimation?: boolean
}

export default function ExerciseIllustration({
  exerciseId = '',
  exerciseName = '',
  imageUrl,
  gifUrl,
  size = 200,
  variant = 'large-banner',
  useAnimation = false,
}: Props) {
  // Prefer animated GIF for large banners/detail views if available
  const resolvedUri =
    (useAnimation && gifUrl) ||
    imageUrl ||
    gifUrl ||
    'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0001-2gPfomN.jpg'

  // 1. CIRCLE THUMBNAIL VARIANT (Matching image 2 / image 5 thumbnails)
  if (variant === 'circle-thumb') {
    return (
      <View
        style={[
          styles.circleThumbContainer,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Image
          source={{ uri: imageUrl || resolvedUri }}
          style={styles.fullImage}
          contentFit="contain"
          transition={150}
          cachePolicy="memory-disk"
        />
        <View style={styles.circleOverlayRing} />
      </View>
    )
  }

  // 2. LARGE HIGH-DEFINITION BANNER VARIANT (Shows the animated GIF technique or photo)
  return (
    <View style={[styles.largeBannerContainer, { height: size }]}>
      <Image
        source={{ uri: resolvedUri }}
        style={styles.fullImage}
        contentFit="contain"
        transition={200}
        cachePolicy="memory-disk"
      />
      <View style={styles.bottomShadowGradient} />
    </View>
  )
}

const styles = StyleSheet.create({
  circleThumbContainer: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  circleOverlayRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  largeBannerContainer: {
    width: '100%',
    backgroundColor: '#06070A',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  bottomShadowGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
})

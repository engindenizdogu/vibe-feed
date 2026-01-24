import { ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../constants/theme';
import { View, Text } from '../src/tw';

interface FeedContainerProps {
  index: number;
}

export function FeedContainer({ index }: FeedContainerProps) {
  // Neo-Brutalism: Bold gradient backgrounds
  const gradients = [
    ['#1A1A1A', '#2A0A3A'],  // Dark purple tint
    ['#1A1A1A', '#0A2A1A'],  // Dark green tint
    ['#1A1A1A', '#2A1A0A'],  // Dark orange tint
  ];
  const [color1, color2] = gradients[index % gradients.length];
  
  // Accent colors for variety
  const accentColors = ['#BEFF00', '#FF006E', '#00F0FF'];
  const accentColor = accentColors[index % accentColors.length];

  return (
    <View className="mb-4">
      {/* Main container with Instagram-like vertical aspect ratio (4:5) */}
      <View 
        className="w-full relative overflow-hidden"
        style={{ 
          backgroundColor: color1,
          aspectRatio: 4/5,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: accentColor + '40', // 25% opacity
        }}
      >
        {/* Placeholder content */}
        <View className="flex-1 items-center justify-center">
          <View className="items-center">
            <Ionicons 
              name="cube-outline" 
              size={56} 
              color={accentColor}
              style={{ marginBottom: 16 }}
            />
            <Text 
              className="text-base mb-2" 
              style={{ 
                color: accentColor, 
                fontSize: 18, 
                marginBottom: 8,
                fontFamily: Fonts.bold,
                letterSpacing: 1,
              }}
            >
              DAYTONA SANDBOX
            </Text>
            <Text 
              className="text-sm" 
              style={{ color: Colors.textSecondary, fontSize: 14 }}
            >
              App Preview #{index + 1}
            </Text>
            
            {/* Loading indicator */}
            <View className="mt-4">
              <ActivityIndicator size="small" color={accentColor} />
            </View>
          </View>
        </View>

        {/* Optional: Badge/label */}
        <View 
          className="absolute top-3 left-3 px-3 py-1"
          style={{ 
            backgroundColor: accentColor,
            borderRadius: 4,
          }}
        >
          <Text 
            className="text-xs" 
            style={{ 
              color: '#000000', 
              fontSize: 11,
              fontFamily: Fonts.bold,
              letterSpacing: 1,
            }}
          >
            PREVIEW
          </Text>
        </View>
      </View>

      {/* Metadata section below container */}
      <View className="px-4 py-3">
        {/* User info placeholder */}
        <View className="flex-row items-center mb-2">
          <View 
            className="w-8 h-8 rounded-full mr-2 items-center justify-center" 
            style={{ 
              backgroundColor: Colors.surfaceLight, 
              width: 32, 
              height: 32, 
              borderRadius: 16, 
              marginRight: 8 
            }}
          >
            <Ionicons name="person" size={16} color={Colors.textSecondary} />
          </View>
          <View>
            <Text 
              className="text-sm" 
              style={{ color: Colors.text, fontSize: 14, fontFamily: Fonts.semibold }}
            >
              Loading...
            </Text>
            <Text 
              className="text-xs" 
              style={{ color: Colors.textMuted, fontSize: 12 }}
            >
              Just now
            </Text>
          </View>
        </View>

        {/* Title placeholder */}
        <Text 
          className="text-base mb-2" 
          style={{ color: Colors.text, fontSize: 16, marginBottom: 8, fontFamily: Fonts.semibold }}
        >
          Sandbox App Preview
        </Text>

        {/* Action buttons */}
        <View className="flex-row items-center gap-4">
          <View 
            className="flex-row items-center gap-1" 
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Ionicons 
              name="heart-outline" 
              size={24} 
              color={Colors.textSecondary} 
            />
            <Text 
              className="text-sm" 
              style={{ color: Colors.textSecondary, fontSize: 14, marginLeft: 4 }}
            >
              0
            </Text>
          </View>

          <View 
            className="flex-row items-center gap-1" 
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Ionicons 
              name="eye-outline" 
              size={24} 
              color={Colors.textSecondary} 
            />
            <Text 
              className="text-sm" 
              style={{ color: Colors.textSecondary, fontSize: 14, marginLeft: 4 }}
            >
              0
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

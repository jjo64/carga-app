import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native'
import {
  Search,
  Plus,
  Check,
  ChevronRight,
  Flame,
  Apple,
  Utensils,
  Sparkles,
  ShieldCheck,
} from 'lucide-react-native'
import {
  COMMON_FOODS_DATABASE,
  COMMON_FOOD_CATEGORIES,
  CommonFoodItem,
  CommonFoodCategory,
} from '@/constants/commonFoodsDatabase'

interface CommonFoodsSelectorProps {
  onAddFood: (food: CommonFoodItem, customGrams?: number) => void
  addedFoodNames?: string[]
}

export default function CommonFoodsSelector({
  onAddFood,
  addedFoodNames = [],
}: CommonFoodsSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CommonFoodCategory>('Todas')
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null)

  const filteredFoods = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return COMMON_FOODS_DATABASE.filter((item) => {
      const matchCategory =
        selectedCategory === 'Todas' || item.category === selectedCategory
      if (!matchCategory) return false

      if (!query) return true

      const nameMatch = item.name.toLowerCase().includes(query)
      const tagsMatch = item.tags?.some((t) => t.toLowerCase().includes(query))
      return nameMatch || tagsMatch
    })
  }, [searchQuery, selectedCategory])

  const handleSelectFood = (item: CommonFoodItem, grams?: number) => {
    onAddFood(item, grams)
    setRecentlyAddedId(item.id)
    setTimeout(() => {
      setRecentlyAddedId(null)
    }, 1200)
  }

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchBarContainer}>
        <Search size={16} color="rgba(255,255,255,0.4)" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar fruta, pollo, arroz, avena, etc..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {COMMON_FOOD_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              activeOpacity={0.75}
            >
              <Text
                style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Foods List */}
      <ScrollView
        style={styles.foodList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {filteredFoods.length === 0 ? (
          <View style={styles.emptyState}>
            <Utensils size={32} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyTitle}>No encontramos "{searchQuery}"</Text>
            <Text style={styles.emptySubtitle}>
              Puedes registrarlo con la pestaña de Escáner o escribir la descripción con IA.
            </Text>
          </View>
        ) : (
          filteredFoods.map((item) => {
            const isJustAdded = recentlyAddedId === item.id
            const isAlreadyAdded = addedFoodNames.some(
              (n) => n.toLowerCase() === item.name.toLowerCase()
            )
            const servingCals = Math.round((item.calories * item.defaultServingG) / 100)
            const servingProt = ((item.protein * item.defaultServingG) / 100).toFixed(1)
            const servingCarb = ((item.carbs * item.defaultServingG) / 100).toFixed(1)
            const servingFat = ((item.fat * item.defaultServingG) / 100).toFixed(1)

            return (
              <View key={item.id} style={styles.foodCard}>
                <View style={styles.foodCardEmojiBox}>
                  <Text style={styles.foodCardEmoji}>{item.emoji}</Text>
                </View>

                <View style={styles.foodCardInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.foodCardName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.verifiedMiniBadge}>
                      <ShieldCheck size={11} color="#10B981" />
                      <Text style={styles.verifiedMiniBadgeText}>Verificado</Text>
                    </View>
                  </View>
                  <Text style={styles.foodCardServing}>
                    {item.defaultServingName} · <Text style={{ color: '#38BDF8', fontWeight: '700' }}>{servingCals} kcal</Text>
                  </Text>
                  <Text style={styles.foodCardMacros}>
                    P: {servingProt}g · C: {servingCarb}g · G: {servingFat}g
                  </Text>
                </View>

                {/* Quick Add Actions */}
                <View style={styles.foodCardActions}>
                  <TouchableOpacity
                    style={[
                      styles.addQuickBtn,
                      isJustAdded && styles.addQuickBtnSuccess,
                      isAlreadyAdded && styles.addQuickBtnAdded,
                    ]}
                    onPress={() => handleSelectFood(item)}
                    activeOpacity={0.8}
                  >
                    {isJustAdded ? (
                      <Check size={14} color="#10B981" />
                    ) : (
                      <Plus size={14} color={isAlreadyAdded ? '#38BDF8' : '#FFFFFF'} />
                    )}
                    <Text
                      style={[
                        styles.addQuickBtnText,
                        isJustAdded && { color: '#10B981' },
                        isAlreadyAdded && { color: '#38BDF8' },
                      ]}
                    >
                      {isJustAdded ? '¡Listo!' : isAlreadyAdded ? '+ Otra' : 'Añadir'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          })
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12141A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13.5,
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: 'bold',
  },
  categoryScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 10,
  },
  categoryChip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  categoryChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  categoryChipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11.5,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  foodList: {
    flex: 1,
    maxHeight: 380,
  },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13161F',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 10,
    marginBottom: 8,
    gap: 10,
  },
  foodCardEmojiBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodCardEmoji: {
    fontSize: 20,
  },
  foodCardInfo: {
    flex: 1,
  },
  foodCardName: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    marginBottom: 2,
    flexShrink: 1,
  },
  verifiedMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  verifiedMiniBadgeText: {
    color: '#10B981',
    fontSize: 9.5,
    fontWeight: '700',
  },
  foodCardServing: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11.5,
    marginBottom: 2,
  },
  foodCardMacros: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10.5,
    fontWeight: '600',
  },
  foodCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addQuickBtnSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  addQuickBtnAdded: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  addQuickBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
})

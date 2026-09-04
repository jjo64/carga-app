import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import {
  Search,
  Plus,
  Minus,
  Check,
  Utensils,
  X,
} from 'lucide-react-native'
import {
  COMMON_FOODS_DATABASE,
  COMMON_FOOD_CATEGORIES,
  CommonFoodItem,
  CommonFoodCategory,
} from '@/constants/commonFoodsDatabase'
import { FoodItemParsed } from '@/types'

interface CommonFoodsSelectorProps {
  onAddFood: (food: CommonFoodItem, customGrams?: number) => void
  onRemoveFood?: (foodName: string) => void
  onUpdateQuantity?: (foodName: string, deltaG: number) => void
  plateItems?: FoodItemParsed[]
  onConfirmGoToPlate?: () => void
}

export default function CommonFoodsSelector({
  onAddFood,
  onRemoveFood,
  onUpdateQuantity,
  plateItems = [],
  onConfirmGoToPlate,
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
    }, 1000)
  }

  const getItemQuantityInPlate = (foodName: string): number => {
    const found = plateItems.find(
      (p) => p.name.toLowerCase() === foodName.toLowerCase()
    )
    return found?.quantity_g || 0
  }

  return (
    <View style={styles.container}>
      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <Search size={16} color="#71717A" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar fruta, pollo, arroz, avena, etc..."
          placeholderTextColor="#71717A"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={14} color="#A1A1AA" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter Chips Horizontal Bar */}
      <View style={styles.categoryScrollWrapper}>
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
      </View>

      {/* Foods List */}
      <ScrollView
        style={styles.foodList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.foodListContent}
        keyboardShouldPersistTaps="handled"
      >
        {filteredFoods.length === 0 ? (
          <View style={styles.emptyState}>
            <Utensils size={32} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyTitle}>No encontramos "{searchQuery}"</Text>
            <Text style={styles.emptySubtitle}>
              Puedes registrarlo con la pestaña de IA o buscar con otro nombre.
            </Text>
          </View>
        ) : (
          filteredFoods.map((item) => {
            const isJustAdded = recentlyAddedId === item.id
            const qtyInPlate = getItemQuantityInPlate(item.name)
            const servingG = item.defaultServingG || 100
            const servingCals = Math.round((item.calories * servingG) / 100)
            const servingProt = ((item.protein * servingG) / 100).toFixed(1)
            const servingCarb = ((item.carbs * servingG) / 100).toFixed(1)
            const servingFat = ((item.fat * servingG) / 100).toFixed(1)

            return (
              <View key={item.id} style={styles.foodCard}>
                {/* Left: Thumbnail Icon Container */}
                <View style={styles.foodCardEmojiBox}>
                  <Text style={styles.foodCardEmoji}>{item.emoji || '🍽️'}</Text>
                </View>

                {/* Middle: Food Details */}
                <View style={styles.foodCardInfo}>
                  <Text style={styles.foodCardName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.foodCardServing} numberOfLines={1}>
                    {item.defaultServingName} · <Text style={styles.foodCardCalsHighlight}>{servingCals} kcal</Text>
                  </Text>
                  <Text style={styles.foodCardMacros}>
                    P: {servingProt}g · C: {servingCarb}g · G: {servingFat}g
                  </Text>
                </View>

                {/* Right: Cart Stepper or Add Button */}
                <View style={styles.foodCardActions}>
                  {qtyInPlate > 0 ? (
                    <View style={styles.cartStepperPill}>
                      <TouchableOpacity
                        style={styles.cartStepBtn}
                        onPress={() => {
                          if (onUpdateQuantity) {
                            onUpdateQuantity(item.name, -servingG)
                          } else if (onRemoveFood) {
                            onRemoveFood(item.name)
                          }
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        activeOpacity={0.7}
                      >
                        <Minus size={13} color="#D4D4D8" />
                      </TouchableOpacity>

                      <View style={styles.cartQtyBox}>
                        <Text style={styles.cartQtyText}>{qtyInPlate}g</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.cartStepBtn}
                        onPress={() => handleSelectFood(item, servingG)}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        activeOpacity={0.7}
                      >
                        <Plus size={13} color="#D4D4D8" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.addPillBtn,
                        isJustAdded && styles.addPillBtnSuccess,
                      ]}
                      onPress={() => handleSelectFood(item, servingG)}
                      activeOpacity={0.8}
                    >
                      <Plus size={13} color={isJustAdded ? '#10B981' : '#09090B'} strokeWidth={2.5} />
                      <Text
                        style={[
                          styles.addPillBtnText,
                          isJustAdded && { color: '#10B981' },
                        ]}
                      >
                        {isJustAdded ? 'Añadido' : 'Añadir'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )
          })
        )}
      </ScrollView>

      {/* Sticky Bottom Confirmation Button */}
      <View style={styles.stickyFooter}>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={onConfirmGoToPlate}
          activeOpacity={0.88}
        >
          <Check size={18} color="#09090B" strokeWidth={2.8} />
          <Text style={styles.confirmBtnText}>
            {plateItems.length > 0
              ? `CONFIRMAR CAMBIOS (${plateItems.length})`
              : 'CONFIRMAR CAMBIOS'}
          </Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#18181B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FAFAFA',
    fontSize: 14,
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  categoryScrollWrapper: {
    marginBottom: 10,
  },
  categoryScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    backgroundColor: '#1E1E22',
    borderWidth: 1,
    borderColor: '#2E2E34',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  categoryChipActive: {
    backgroundColor: '#FAFAFA',
    borderColor: '#FAFAFA',
  },
  categoryChipText: {
    color: '#A1A1AA',
    fontSize: 12.5,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#09090B',
    fontWeight: '800',
  },
  foodList: {
    flex: 1,
  },
  foodListContent: {
    paddingBottom: 16,
  },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 13,
    marginBottom: 10,
  },
  foodCardEmojiBox: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: '#242428',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  foodCardEmoji: {
    fontSize: 28,
  },
  foodCardInfo: {
    flex: 1,
    paddingRight: 8,
  },
  foodCardName: {
    color: '#FAFAFA',
    fontSize: 14.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  foodCardServing: {
    color: '#A1A1AA',
    fontSize: 12,
    marginBottom: 2,
  },
  foodCardCalsHighlight: {
    color: '#D4D4D8',
    fontWeight: '600',
  },
  foodCardMacros: {
    color: '#71717A',
    fontSize: 11.5,
    fontWeight: '500',
  },
  foodCardActions: {
    alignItems: 'flex-end',
  },
  addPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  addPillBtnSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  addPillBtnText: {
    color: '#09090B',
    fontSize: 12.5,
    fontWeight: '800',
  },
  cartStepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  cartStepBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cartQtyBox: {
    paddingHorizontal: 6,
  },
  cartQtyText: {
    color: '#FAFAFA',
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
    color: '#FAFAFA',
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
  stickyFooter: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#121214',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FAFAFA',
    borderRadius: 26,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    color: '#09090B',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
})

import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';

import { colors, fonts, radius } from '@/lib/theme';

const ITEM_H = 46;
const VISIBLE = 5; // nº de filas visibles (impar: la del centro es la elegida)

/**
 * Selector en forma de rueda (como el de la hora del móvil): se desliza hacia
 * arriba o abajo y el valor del centro queda seleccionado.
 */
export function WheelPicker({
  values,
  value,
  onChange,
  format = String,
  width = 220,
}: {
  values: number[];
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  width?: number;
}) {
  const ref = useRef<ScrollViewInstance>(null);
  const startIndex = Math.max(0, values.indexOf(value));
  const [index, setIndex] = useState(startIndex);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Colocar la rueda en el valor actual (al abrir y si cambia desde fuera)
  useEffect(() => {
    const i = Math.max(0, values.indexOf(value));
    if (i !== index) {
      setIndex(i);
      ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollTo({ y: startIndex * ITEM_H, animated: false }), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const indexFor = (y: number) => Math.min(values.length - 1, Math.max(0, Math.round(y / ITEM_H)));

  const commit = (y: number) => {
    const i = indexFor(y);
    setIndex(i);
    if (values[i] !== value) onChange(values[i]);
    // Ajuste fino al centro (en web no siempre hay "snap")
    if (Math.abs(y - i * ITEM_H) > 1) ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    setIndex(indexFor(y));
    if (Platform.OS === 'web') {
      if (settle.current) clearTimeout(settle.current);
      settle.current = setTimeout(() => commit(y), 140);
    }
  };

  return (
    <View style={{ height: ITEM_H * VISIBLE, width, alignSelf: 'center' }}>
      {/* Banda central */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: ITEM_H * Math.floor(VISIBLE / 2),
          left: 0,
          right: 0,
          height: ITEM_H,
          borderRadius: radius.md,
          backgroundColor: colors.lavender,
          borderWidth: 1.5,
          borderColor: colors.lavenderDark + '55',
        }}
      />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={(e) => commit(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => {
          // Si se suelta sin inercia, no llega onMomentumScrollEnd
          const y = e.nativeEvent.contentOffset.y;
          if (!e.nativeEvent.velocity || Math.abs(e.nativeEvent.velocity.y) < 0.05) commit(y);
        }}
        contentContainerStyle={{ paddingVertical: ITEM_H * Math.floor(VISIBLE / 2) }}>
        {values.map((v, i) => {
          const dist = Math.abs(i - index);
          return (
            <View key={v} style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}>
              <Text
                onPress={() => {
                  ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
                  setIndex(i);
                  onChange(v);
                }}
                style={{
                  fontFamily: dist === 0 ? fonts.bold : fonts.semibold,
                  fontSize: dist === 0 ? 26 : dist === 1 ? 20 : 16,
                  color: dist === 0 ? colors.night : colors.muted,
                  opacity: dist === 0 ? 1 : dist === 1 ? 0.75 : 0.4,
                }}>
                {format(v)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

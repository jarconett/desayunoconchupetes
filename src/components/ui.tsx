import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radius, shadow } from '@/lib/theme';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export const MAX_WIDTH = 920;

// ---------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------
type TxtVariant = 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'label' | 'caption';

export function Txt({
  children,
  variant = 'body',
  color,
  center,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  variant?: TxtVariant;
  color?: string;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[txt[variant], color ? { color } : null, center ? { textAlign: 'center' } : null, style]}>
      {children}
    </Text>
  );
}

const txt = StyleSheet.create({
  h1: { fontFamily: fonts.bold, fontSize: 26, color: colors.text, letterSpacing: -0.2 },
  h2: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  h3: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  body: { fontFamily: fonts.medium, fontSize: 15, color: colors.text, lineHeight: 22 },
  small: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, lineHeight: 18 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text, marginBottom: 6 },
  caption: { fontFamily: fonts.semibold, fontSize: 11, color: colors.muted, letterSpacing: 0.6, textTransform: 'uppercase' },
});

export function Icon({ name, size = 22, color = colors.text }: { name: IconName | string; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={name as IconName} size={size} color={color} />;
}

// ---------------------------------------------------------------------
// Pantalla y cabecera
// ---------------------------------------------------------------------
export function Screen({
  children,
  refreshing,
  onRefresh,
  header,
  padded = true,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  header?: ReactNode;
  padded?: boolean;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined
        }>
        {header}
        <View style={[styles.content, padded && { paddingHorizontal: 16 }]}>{children}</View>
      </ScrollView>
    </View>
  );
}

/** Cabecera con degradado nocturno pastel, lunita y estrellas. */
export function HeroHeader({
  title,
  subtitle,
  showLogo,
  right,
  back,
  children,
}: {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
  right?: ReactNode;
  back?: boolean;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={['#DCE2F2', '#E8E1F5', '#FBF7F2']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
      style={{ paddingTop: insets.top + 12, paddingBottom: 20 }}>
      <Stars />
      <View style={[styles.content, { paddingHorizontal: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {back ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              style={styles.roundBtn}>
              <Icon name="chevron-left" size={26} color={colors.night} />
            </Pressable>
          ) : null}
          {showLogo ? <Logo size={58} /> : null}
          <View style={{ flex: 1 }}>
            <Txt variant="h1" color={colors.night}>
              {title}
            </Txt>
            {subtitle ? (
              <Txt variant="small" style={{ marginTop: 2 }}>
                {subtitle}
              </Txt>
            ) : null}
          </View>
          {right}
        </View>
        {children}
      </View>
    </LinearGradient>
  );
}

function Stars() {
  const stars: { top: number; left?: string; right?: number; size: number; icon: IconName }[] = [
    { top: 18, right: 24, size: 22, icon: 'moon-waning-crescent' },
    { top: 54, right: 70, size: 10, icon: 'star-four-points' },
    { top: 30, right: 120, size: 8, icon: 'star-four-points' },
    { top: 80, right: 16, size: 12, icon: 'star-four-points-outline' },
  ];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {stars.map((s, i) => (
        <View key={i} style={{ position: 'absolute', top: s.top, right: s.right, opacity: 0.55 }}>
          <Icon name={s.icon} size={s.size} color="#FFFFFF" />
        </View>
      ))}
    </View>
  );
}

export function Logo({ size = 120 }: { size?: number }) {
  return (
    <Image
      source={require('@/assets/images/logo.png')}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityLabel="Desayuno con Chupetes"
    />
  );
}

export function BellButton({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Avisos" onPress={onPress} style={styles.roundBtn}>
      <Icon name="bell-outline" size={22} color={colors.night} />
      {count > 0 ? (
        <View style={styles.dot}>
          <Text style={{ color: '#fff', fontSize: 10, fontFamily: fonts.bold }}>{count > 9 ? '9+' : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------
// Contenedores
// ---------------------------------------------------------------------
export function Card({
  children,
  style,
  onPress,
  tint,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tint?: string;
}) {
  const body = <View style={[styles.card, tint ? { backgroundColor: tint, borderColor: 'transparent' } : null, style]}>{children}</View>;
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.995 : 1 }] })}>
      {body}
    </Pressable>
  );
}

export function SectionTitle({ children, icon, action }: { children: ReactNode; icon?: IconName | string; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 10, gap: 8 }}>
      {icon ? <Icon name={icon} size={20} color={colors.primary} /> : null}
      <Txt variant="h3" style={{ flex: 1 }}>
        {children}
      </Txt>
      {action}
    </View>
  );
}

export function Row({ children, style, gap = 10 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function IconBubble({ name, bg = colors.primarySoft, color = colors.primaryDark, size = 44 }: { name: IconName | string; bg?: string; color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={size * 0.5} color={color} />
    </View>
  );
}

export function Badge({ label, bg = colors.primarySoft, color = colors.primaryDark, icon }: { label: string; bg?: string; color?: string; icon?: IconName | string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon ? <Icon name={icon} size={13} color={color} /> : null}
      <Text style={{ color, fontFamily: fonts.semibold, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

export function Empty({ icon = 'weather-night', title, text, action }: { icon?: IconName | string; title: string; text?: string; action?: ReactNode }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
      <IconBubble name={icon} bg={colors.lavender} color={colors.lavenderDark} size={56} />
      <Txt variant="h3" center style={{ marginTop: 12 }}>
        {title}
      </Txt>
      {text ? (
        <Txt variant="small" center style={{ marginTop: 4, maxWidth: 380 }}>
          {text}
        </Txt>
      ) : null}
      {action ? <View style={{ marginTop: 14 }}>{action}</View> : null}
    </Card>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: 40 }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />;
}

// ---------------------------------------------------------------------
// Controles
// ---------------------------------------------------------------------
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  small,
  style,
}: {
  title: string;
  onPress?: () => void | Promise<void>;
  variant?: ButtonVariant;
  icon?: IconName | string;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [busy, setBusy] = useState(false);
  const v = buttonVariants[variant];
  const isLoading = loading || busy;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || isLoading}
      onPress={async () => {
        if (!onPress) return;
        const r = onPress();
        if (r instanceof Promise) {
          setBusy(true);
          try {
            await r;
          } finally {
            setBusy(false);
          }
        }
      }}
      style={({ pressed }) => [
        styles.button,
        small && { paddingVertical: 8, paddingHorizontal: 14 },
        { backgroundColor: v.bg, borderColor: v.border },
        (disabled || isLoading) && { opacity: 0.55 },
        pressed && { opacity: 0.8 },
        style,
      ]}>
      {isLoading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : icon ? (
        <Icon name={icon} size={small ? 16 : 19} color={v.fg} />
      ) : null}
      <Text style={{ color: v.fg, fontFamily: fonts.bold, fontSize: small ? 13 : 15 }}>{title}</Text>
    </Pressable>
  );
}

const buttonVariants: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: colors.white, border: colors.primary },
  secondary: { bg: colors.white, fg: colors.primaryDark, border: colors.primary },
  ghost: { bg: 'transparent', fg: colors.primaryDark, border: 'transparent' },
  danger: { bg: colors.white, fg: colors.danger, border: '#EFC7C3' },
  soft: { bg: colors.primarySoft, fg: colors.primaryDark, border: colors.primarySoft },
};

export function Input({
  label,
  hint,
  style,
  multiline,
  ...props
}: TextInputProps & { label?: string; hint?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Txt variant="label">{label}</Txt> : null}
      <TextInput
        placeholderTextColor="#B0AEB8"
        multiline={multiline}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          styles.input,
          multiline && { minHeight: 96, textAlignVertical: 'top', paddingTop: 12 },
          focused && { borderColor: colors.primary, backgroundColor: '#FFFFFF' },
          style,
        ]}
        {...props}
      />
      {hint ? (
        <Txt variant="small" style={{ marginTop: 4 }}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

export function Chips<T extends string | number>({
  options,
  value,
  onChange,
  wrap = true,
}: {
  options: { value: T; label: string; icon?: IconName | string; disabled?: boolean }[];
  value: T | null | undefined;
  onChange: (v: T) => void;
  wrap?: boolean;
}) {
  const content = options.map((o) => {
    const selected = o.value === value;
    return (
      <Pressable
        key={String(o.value)}
        disabled={o.disabled}
        onPress={() => onChange(o.value)}
        accessibilityRole="button"
        accessibilityState={{ selected, disabled: o.disabled }}
        style={[
          styles.chip,
          selected && { backgroundColor: colors.primary, borderColor: colors.primary },
          o.disabled && { opacity: 0.35 },
        ]}>
        {o.icon ? <Icon name={o.icon} size={16} color={selected ? '#fff' : colors.primaryDark} /> : null}
        <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: selected ? '#fff' : colors.text }}>{o.label}</Text>
      </Pressable>
    );
  });
  if (wrap) return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{content}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
      {content}
    </ScrollView>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={[styles.toggle, value && { backgroundColor: colors.primary }]}>
        <View style={[styles.knob, value && { transform: [{ translateX: 20 }] }]} />
      </View>
      {label ? <Txt>{label}</Txt> : null}
    </Pressable>
  );
}

export function ListItem({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  right,
  onPress,
  locked,
}: {
  icon: IconName | string;
  iconBg?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  locked?: boolean;
}) {
  return (
    <Card onPress={locked ? undefined : onPress} style={[{ marginBottom: 10 }, locked && { opacity: 0.6 }]}>
      <Row>
        <IconBubble name={locked ? 'lock-outline' : icon} bg={locked ? colors.border : iconBg} color={locked ? colors.muted : iconColor} />
        <View style={{ flex: 1 }}>
          <Txt variant="h3">{title}</Txt>
          {subtitle ? <Txt variant="small">{subtitle}</Txt> : null}
        </View>
        {right ?? (onPress && !locked ? <Icon name="chevron-right" color={colors.muted} /> : null)}
      </Row>
    </Card>
  );
}

// ---------------------------------------------------------------------
// Diálogos simples multiplataforma
// ---------------------------------------------------------------------
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') window.alert(message ? `${title}\n\n${message}` : title);
  else Alert.alert(title, message);
}

export function confirmAction(title: string, message: string, confirmText = 'Aceptar'): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, onPress: () => resolve(true) },
    ]),
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  input: {
    backgroundColor: '#FDFBF8',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.roseDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggle: { width: 46, height: 26, borderRadius: 13, backgroundColor: colors.border, padding: 3 },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', ...shadow },
});

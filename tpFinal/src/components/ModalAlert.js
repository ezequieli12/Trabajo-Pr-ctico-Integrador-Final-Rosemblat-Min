// src/components/ModalAlert.js  (ajustá la ruta según tu proyecto)
import React, { useEffect, useMemo, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ModalAlert({
  visible,
  onClose,
  title,
  message,
  variant = 'info',
  dismissOnBackdrop = true,
  primary,   // { label?: string, onPress?: () => void }
  secondary, // { label?: string, onPress?: () => void }
  children,
}) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  const theme = useMemo(() => {
    const v = {
      info:    { icon: 'ℹ️',  color: '#2563EB' },
      success: { icon: '✅',   color: '#16A34A' },
      warning: { icon: '⚠️',   color: '#F59E0B' },
      danger:  { icon: '⛔',   color: '#DC2626' },
    };
    return v[variant] || v.info;
  }, [variant]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 140, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.96, duration: 140, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 10, duration: 140, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const close = () => onClose?.();
  const handlePrimary = () => { try { primary?.onPress?.(); } finally { close(); } };
  const handleSecondary = () => { try { secondary?.onPress?.(); } finally { close(); } };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <View style={s.root} pointerEvents="box-none" accessible accessibilityViewIsModal>
        {/* Backdrop (animado) */}
        <AnimatedPressable
          style={[s.backdrop, { opacity: backdropOpacity }]}
          onPress={dismissOnBackdrop ? close : undefined}
          accessibilityRole="button"
          accessibilityLabel="Cerrar modal"
        />

        {/* Card */}
        <Animated.View style={[s.card, { transform: [{ scale }, { translateY }] }]} accessibilityRole="alert">
          <View style={s.header}>
            <View style={[s.iconWrap, { backgroundColor: hexA(theme.color, 0.1), borderColor: hexA(theme.color, 0.6) }]}>
              <Text style={[s.icon, { color: theme.color }]}>{theme.icon}</Text>
            </View>
            <Text style={s.title}>
              {title || ({ info: 'Información', success: 'Éxito', warning: 'Atención', danger: 'Error' }[variant])}
            </Text>
          </View>

          <View style={s.body}>
            {children ?? (typeof message === 'string' ? <Text style={s.msg}>{message}</Text> : message)}
          </View>

          <View style={s.footer}>
            {secondary && (
              <Pressable style={[s.btn, s.ghost]} onPress={handleSecondary} android_ripple={{ color: '#00000014' }}>
                <Text style={[s.btnText, s.ghostText]}>{secondary.label || 'Cancelar'}</Text>
              </Pressable>
            )}
            <Pressable style={[s.btn, { backgroundColor: theme.color }]} onPress={handlePrimary} android_ripple={{ color: '#ffffff33' }}>
              <Text style={[s.btnText, s.primaryText]}>{primary?.label || 'Aceptar'}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/* helpers */
function hexA(hex, a = 1) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const [r, g, b] = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  return `rgba(${r},${g},${b},${a})`;
}

/* styles */
const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.58)' },
  card: {
    width: '86%', maxWidth: 420, borderRadius: 16, paddingVertical: 16, backgroundColor: '#FFF',
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 8 },
  },
  header: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconWrap: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginRight: 12 },
  icon: { fontSize: 18 },
  title: { flex: 1, fontSize: 18, fontWeight: Platform.OS === 'ios' ? '600' : '700', color: '#0F172A' },
  body: { paddingHorizontal: 16, paddingBottom: 4 },
  msg: { fontSize: 15.5, lineHeight: 22, color: '#334155' },
  footer: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6, flexDirection: 'row', justifyContent: 'flex-end' },
  btn: { minWidth: 108, height: 42, borderRadius: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  btnText: { fontSize: 15, fontWeight: '600' },
  primaryText: { color: '#FFF' },
  ghost: { backgroundColor: '#F1F5F9' },
  ghostText: { color: '#0F172A' },
});

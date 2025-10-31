// App.js o app/app.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView, Pressable, Platform,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Localization from 'expo-localization';
import ModalAlert from '../src/components/ModalAlert'; // si usás App.js en raíz: './src/components/ModalAlert'

export default function App() {
  // ---------- Modal ----------
  const [modal, setModal] = useState({ visible: false, mode: null }); // 'create' | 'delete'

  // ---------- Localization ----------
  const deviceLocale = Localization.getLocales?.()[0]?.languageTag || 'es-AR';
  const deviceTZ = Localization.timezone || 'America/Argentina/Buenos_Aires';
  const [locale, setLocale] = useState(deviceLocale);

  // ---------- WorldTag ----------
  const [entry, setEntry] = useState(null); // { uri, coords, address, capturedAt }

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') console.warn('Permiso de ubicación denegado');
    })();
  }, []);

  // ---------- Formato ----------
  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short', timeZone: deviceTZ }),
    [locale, deviceTZ]
  );
  const fmtCoords = (c) => `Lat ${c.latitude.toFixed(6)} · Lon ${c.longitude.toFixed(6)}`;

  const formatPlace = (address) => {
    if (!address) return '—';
    const city = address.city || address.district || null;
    let region = address.region || null;
    const country = address.country || null;
    if (region && region.toLowerCase().includes('ciudad autónoma de buenos aires')) region = 'CABA';
    if (city && region && city.toLowerCase() === region.toLowerCase()) region = null;
    const parts = [city, region, country].filter(Boolean);
    return parts.length ? parts.join(', ') : 'Cerca de tu ubicación';
  };

  // ---------- Acciones ----------
  const handleCreateEntry = async () => {
    try {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (cam.status !== 'granted') { alert('Necesitamos permiso de cámara.'); return; }
      const photo = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 1 });
      if (photo.canceled) return;
      const uri = photo.assets?.[0]?.uri ?? photo.uri;

      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') { alert('Necesitamos permiso de ubicación.'); return; }
      const pos = await Location.getCurrentPositionAsync({});
      const coords = pos.coords;

      let address = { city: null, region: null, country: null };
      try {
        const r = await Location.reverseGeocodeAsync({ latitude: coords.latitude, longitude: coords.longitude });
        const a = r?.[0];
        address = { city: a?.city || a?.district || null, region: a?.region || null, country: a?.country || null };
      } catch {}

      setEntry({ uri, coords, address, capturedAt: new Date().toISOString() });
    } finally {
      setModal({ visible: false, mode: null });
    }
  };
  const handleDeleteEntry = () => { setEntry(null); setModal({ visible: false, mode: null }); };

  // ---------- UI ----------
  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={s.header}>
          <Text style={s.eyebrow}>WorldTag</Text>
          <Text style={s.title}>Travel Micro-Journal</Text>
          <View style={s.badges}>
            <Badge>📸 Cámara</Badge>
            <Badge>📍 Ubicación</Badge>
            <Badge>🌐 Localization</Badge>
            <Badge>✅ Modal</Badge>
          </View>
        </View>

        {/* NUEVO */}
        <Card>
          <CardHeader title="Nuevo WorldTag" />
          <Text style={s.body}>
            Capturá una foto, se geoetiqueta automáticamente y se muestra con formato regional.
          </Text>
          <PrimaryButton label="Crear registro" onPress={() => setModal({ visible: true, mode: 'create' })} />
        </Card>

        {/* ÚLTIMO REGISTRO */}
        <Card>
          <CardHeader title="Último registro" />
          {entry ? (
            <View>
              <Image source={{ uri: entry.uri }} style={s.media} resizeMode="cover" />
              <Divider />
              <Row>
                <Label>Ubicación</Label>
                <View style={{ flex: 1 }}>
                  <Text style={s.valueStrong}>📍 {formatPlace(entry.address)}</Text>
                  <Text style={s.valueMuted}>{fmtCoords(entry.coords)}</Text>
                </View>
              </Row>
              <Row>
                <Label>Fecha/Hora</Label>
                <Text style={s.value}>{dateFmt.format(new Date(entry.capturedAt))}</Text>
              </Row>
              <Actions>
                <SecondaryButton label="Eliminar" onPress={() => setModal({ visible: true, mode: 'delete' })} />
              </Actions>
            </View>
          ) : (
            <EmptyState title="Aún no hay registros" subtitle="Creá el primero desde el botón." />
          )}
        </Card>

        {/* LOCALIZATION */}
        <Card>
          <CardHeader title="Preferencias regionales" />
          <Text style={s.helper}>Dispositivo: {deviceLocale} · {deviceTZ}</Text>
          <Segment>
            <Chip label="🇦🇷 es-AR" active={locale==='es-AR'} onPress={() => setLocale('es-AR')} />
            <Chip label="🇺🇸 en-US" active={locale==='en-US'} onPress={() => setLocale('en-US')} />
            <Chip label="🇧🇷 pt-BR" active={locale==='pt-BR'} onPress={() => setLocale('pt-BR')} />
          </Segment>
        </Card>

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* MODAL */}
      <ModalAlert
        visible={modal.visible}
        onClose={() => setModal({ visible: false, mode: null })}
        variant={modal.mode === 'delete' ? 'danger' : 'warning'}
        title={modal.mode === 'delete' ? 'Eliminar registro' : 'Crear registro'}
        message={
          modal.mode === 'delete'
            ? '¿Querés eliminar el último WorldTag? Esta acción no se puede deshacer.'
            : 'Vamos a abrir la cámara y capturar tu WorldTag con ubicación actual.'
        }
        secondary={{ label: 'Cancelar' }}
        primary={{
          label: modal.mode === 'delete' ? 'Eliminar' : 'Crear',
          onPress: modal.mode === 'delete' ? handleDeleteEntry : handleCreateEntry,
        }}
      />
    </View>
  );
}

/* ---------- Sub-componentes UI (para que el estilo se note más) ---------- */
function Badge({ children }) { return <View style={s.badge}><Text style={s.badgeText}>{children}</Text></View>; }
function Card({ children }) { return <View style={s.card}>{children}</View>; }
function CardHeader({ title }) { return <Text style={s.cardTitle}>{title}</Text>; }
function Divider() { return <View style={s.divider} />; }
function Row({ children }) { return <View style={s.row}>{children}</View>; }
function Label({ children }) { return <Text style={s.label}>{children}</Text>; }
function Actions({ children }) { return <View style={s.actions}>{children}</View>; }
function EmptyState({ title, subtitle }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptySub}>{subtitle}</Text>
    </View>
  );
}
function PrimaryButton({ label, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.btn, s.btnPrimary, pressed && s.btnPressed]} android_ripple={{ color: '#ffffff33' }}>
      <Text style={s.btnPrimaryText}>{label}</Text>
    </Pressable>
  );
}
function SecondaryButton({ label, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.btn, s.btnGhost, pressed && s.btnGhostPressed]} android_ripple={{ color: '#00000012' }}>
      <Text style={s.btnGhostText}>{label}</Text>
    </Pressable>
  );
}
function Segment({ children }) { return <View style={s.segment}>{children}</View>; }
function Chip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]} android_ripple={{ color: '#00000010' }}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

/* ---------- ESTILOS: versión mejor trabajada ---------- */
const s = StyleSheet.create({
  /* Base */
  root: { flex: 1, backgroundColor: '#F3F5F8' },
  container: { paddingHorizontal: 16, paddingTop: 26, paddingBottom: 16, alignItems: 'center' },

  /* Header mejorado */
  header: { width: '100%', maxWidth: 760, marginBottom: 8 },
  eyebrow: { color: '#6B7280', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  title: { marginTop: 2, fontSize: 26, lineHeight: 32, fontWeight: '900', color: '#0F172A' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginHorizontal: -4 },
  badge: {
    backgroundColor: '#EEF2FF', borderColor: '#C7D2FE', borderWidth: 1,
    borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10, marginHorizontal: 4, marginVertical: 4,
  },
  badgeText: { color: '#1E3A8A', fontWeight: '700', fontSize: 12.5 },

  /* Cards con acento lateral y mejor sombra */
  card: {
    width: '100%', maxWidth: 760,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginVertical: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
    overflow: 'hidden',
    borderLeftWidth: 4,               // acento principal visible
    borderLeftColor: '#2563EB33',
    ...shadow(Platform.OS),
  },
  cardTitle: { color: '#0F172A', fontSize: 18, fontWeight: '900', marginBottom: 10, letterSpacing: 0.2 },

  /* Tipos de texto */
  body: { color: '#334155', lineHeight: 20 },
  helper: { color: '#6B7280', fontSize: 12.5 },

  /* Media */
  media: {
    width: '100%', aspectRatio: 4 / 3, borderRadius: 14, marginTop: 6,
    borderWidth: 1, borderColor: '#E5E7EB', alignSelf: 'stretch',
  },

  /* Filas clave-valor */
  row: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10 },
  label: {
    width: 120, color: '#374151', fontWeight: '800', letterSpacing: 0.3,
    textTransform: 'none', paddingTop: 2,
  },
  value: { flex: 1, color: '#111827' },
  valueStrong: { flex: 1, color: '#0B1324', fontWeight: '700' },
  valueMuted: { flex: 1, color: '#6B7280', marginTop: 2, fontSize: 12.5 },

  divider: { height: 1, backgroundColor: '#E6E8EB', marginVertical: 12, borderRadius: 10 },

  /* Empty state */
  empty: { paddingVertical: 8 },
  emptyTitle: { color: '#0F172A', fontWeight: '800' },
  emptySub: { color: '#6B7280' },

  /* Botones */
  actions: { flexDirection: 'row', marginTop: 10 },
  btn: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignSelf: 'flex-start' },
  btnPrimary: { backgroundColor: '#2563EB', ...shadowBtn(Platform.OS) },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '800', letterSpacing: 0.2 },
  btnPressed: { opacity: 0.94 },
  btnGhost: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  btnGhostText: { color: '#0F172A', fontWeight: '800', letterSpacing: 0.2 },
  btnGhostPressed: { opacity: 0.98 },

  /* Segmento idiomas */
  segment: {
    flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB', padding: 4, marginTop: 10,
  },
  chip: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
    backgroundColor: 'transparent', marginRight: 6,
  },
  chipActive: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#C7D2FE' },
  chipText: { color: '#111827', fontWeight: '700' },
  chipTextActive: { color: '#1D4ED8', fontWeight: '800' },
});

/* sombras */
function shadow(os) {
  return os === 'ios'
    ? { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } }
    : { elevation: 4 };
}
function shadowBtn(os) {
  return os === 'ios'
    ? { shadowColor: '#2563EB', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 4 } }
    : { elevation: 3 };
}

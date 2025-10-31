// App.js o app/app.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView, Pressable, Platform,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Localization from 'expo-localization';
import ModalAlert from '../src/components/ModalAlert'; // <- si estás en app/app.js
// Si estás en App.js (raíz):  import ModalAlert from './src/components/ModalAlert';

export default function App() {
  // ---------- Modal ----------
  const [modal, setModal] = useState({ visible: false, mode: null }); // mode: 'create'|'delete'

  // ---------- Localization ----------
  const deviceLocale = Localization.getLocales?.()[0]?.languageTag || 'es-AR';
  const deviceCurrency = Localization.getLocales?.()[0]?.currencyCode || 'ARS';
  const deviceTZ = Localization.timezone || 'America/Argentina/Buenos_Aires';
  const [locale, setLocale] = useState(deviceLocale);
  const [currency, setCurrency] = useState(deviceCurrency);

  // ---------- WorldTag (último registro) ----------
  const [entry, setEntry] = useState(null); // { uri, coords, address, capturedAt }

  // ---------- Permisos base (ubicación) ----------
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // no bloqueamos la app: podrás crear luego cuando el usuario acepte
        console.warn('Permiso de ubicación denegado');
      }
    })();
  }, []);

  // ---------- Helpers de formato ----------
  const moneyFmt = useMemo(
    () => new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2 }),
    [locale, currency]
  );
  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short', timeZone: deviceTZ }),
    [locale, deviceTZ]
  );

  const fmtCoords = (c) =>
    `Lat ${c.latitude.toFixed(6)} · Lon ${c.longitude.toFixed(6)}`;

  // ---------- Crear WorldTag (foto + gps + address) ----------
  const handleCreateEntry = async () => {
    try {
      // 1) Cámara
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (cam.status !== 'granted') {
        alert('Necesitamos permiso de cámara.');
        return;
      }
      const photo = await ImagePicker.launchCameraAsync({
        allowsEditing: true, aspect: [4, 3], quality: 1,
      });
      if (photo.canceled) return;
      const uri = photo.assets?.[0]?.uri ?? photo.uri;

      // 2) Ubicación
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Necesitamos permiso de ubicación.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const coords = pos.coords;

      // 3) Reverse geocode (ciudad/país)
      let address = { city: null, region: null, country: null };
      try {
        const r = await Location.reverseGeocodeAsync({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        const a = r?.[0];
        address = {
          city: a?.city || a?.district || null,
          region: a?.region || null,
          country: a?.country || null,
        };
      } catch (e) {
        // si falla, seguimos con coords
      }

      // 4) Guardar en estado (último registro)
      setEntry({
        uri,
        coords,
        address,
        capturedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn(e);
    } finally {
      setModal({ visible: false, mode: null });
    }
  };

  const handleDeleteEntry = () => {
    setEntry(null);
    setModal({ visible: false, mode: null });
  };

  // ---------- UI ----------
  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>WorldTag — Travel Micro-Journal</Text>
          <Text style={s.subtitle}>
            Cámara · Ubicación · Localization · Confirmaciones (Modal)
          </Text>
        </View>

        {/* Crear registro */}
        <Card>
          <SectionTitle>Nuevo WorldTag</SectionTitle>
          <Text style={s.text}>
            Capturá una foto, se geoetiqueta automáticamente y se formatea según el locale elegido.
          </Text>
          <PrimaryButton
            label="Crear registro"
            onPress={() => setModal({ visible: true, mode: 'create' })}
          />
        </Card>

        {/* Último registro (sin FlatList) */}
        <Card>
          <SectionTitle>Último registro</SectionTitle>
          {entry ? (
            <View>
              <Image source={{ uri: entry.uri }} style={s.preview} resizeMode="cover" />
              <Divider />
              <KeyValue k="Lugar" v={
                [entry.address.city, entry.address.region, entry.address.country]
                  .filter(Boolean).join(', ') || '—'
              } />
              <KeyValue k="Coordenadas" v={fmtCoords(entry.coords)} />
              <KeyValue k="Fecha/Hora" v={dateFmt.format(new Date(entry.capturedAt))} />
              <View style={s.row}>
                <SecondaryButton
                  label="Eliminar"
                  onPress={() => setModal({ visible: true, mode: 'delete' })}
                />
              </View>
            </View>
          ) : (
            <Text style={s.textMuted}>Aún no hay registros. Creá el primero.</Text>
          )}
        </Card>

        {/* Localization (selector) */}
        <Card>
          <SectionTitle>Preferencias regionales</SectionTitle>
          <Text style={s.textMutedSmall}>
            Dispositivo: {deviceLocale} · {deviceTZ}
          </Text>
          <View style={s.rowWrap}>
            <Chip label="es AR" active={locale==='es-AR'}
              onPress={() => { setLocale('es-AR');}} />
            <Chip label="en US" active={locale==='en-US'}
              onPress={() => { setLocale('en-US'); }} />
            <Chip label="pt BR" active={locale==='pt-BR'}
              onPress={() => { setLocale('pt-BR');}} />
          </View>
          <Divider />
        </Card>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Modal centralizado para crear/eliminar */}
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

/* ---------- UI helpers ---------- */
function Card({ children }) {
  return <View style={s.card}>{children}</View>;
}
function SectionTitle({ children }) {
  return <Text style={s.sectionTitle}>{children}</Text>;
}
function Divider() {
  return <View style={s.divider} />;
}
function KeyValue({ k, v }) {
  return (
    <View style={s.kvRow}>
      <Text style={s.kKey}>{k}</Text>
      <Text style={s.kVal}>{v}</Text>
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
function Chip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]} android_ripple={{ color: '#00000012' }}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

/* ---------- Styles (sobrios) ---------- */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F7FB' },
  container: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 12, alignItems: 'center' },

  header: { width: '100%', maxWidth: 720, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: 0.2 },
  subtitle: { marginTop: 4, color: '#475569' },

  card: {
    width: '100%', maxWidth: 720,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1, borderColor: '#E5E7EB',
    overflow: 'hidden',
    ...shadow(Platform.OS),
  },

  sectionTitle: { color: '#0F172A', fontSize: 16, fontWeight: '800', marginBottom: 8 },

  text: { color: '#334155', lineHeight: 20 },
  textMuted: { color: '#64748B' },
  textMutedSmall: { color: '#64748B', fontSize: 12.5 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },

  // chips
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginBottom: 6, marginHorizontal: -4 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
    marginHorizontal: 4, marginVertical: 4,
  },
  chipActive: { backgroundColor: '#E0E7FF', borderColor: '#C7D2FE' },
  chipText: { color: '#0F172A', fontWeight: '600' },
  chipTextActive: { color: '#1D4ED8', fontWeight: '700' },

  // KVs
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 10, borderRadius: 10 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginVertical: 4 },
  kKey: { color: '#334155', fontWeight: '700' },
  kVal: { color: '#0F172A' },

  // imagen
  preview: {
    width: '100%', aspectRatio: 4 / 3, borderRadius: 12, marginTop: 8,
    borderWidth: 1, borderColor: '#E5E7EB', alignSelf: 'stretch',
  },

  // botones
  btn: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, alignSelf: 'flex-start', marginTop: 8 },
  btnPrimary: { backgroundColor: '#2563EB' },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '700', letterSpacing: 0.2 },
  btnPressed: { opacity: 0.9 },
  btnGhost: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  btnGhostText: { color: '#0F172A', fontWeight: '700', letterSpacing: 0.2 },
  btnGhostPressed: { opacity: 0.9 },
});

function shadow(os) {
  return os === 'ios'
    ? { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }
    : { elevation: 3 };
}

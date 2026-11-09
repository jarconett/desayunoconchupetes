import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { formatShortDate, pad } from '@/lib/dates';
import { colors } from '@/lib/theme';

import { Txt } from './ui';

interface BuildInfo {
  commit?: string;
  commitDate?: string;
  builtAt?: string;
}

const fmt = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${formatShortDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Datos de la versión instalada (los rellena app.config.js al compilar). */
export function getVersionInfo() {
  const cfg = Constants.expoConfig;
  const info = ((cfg?.extra as { buildInfo?: BuildInfo } | undefined)?.buildInfo ?? {}) as BuildInfo;
  return {
    version: cfg?.version ?? '—',
    commit: info.commit ?? '',
    commitDate: fmt(info.commitDate),
    builtAt: fmt(info.builtAt),
    platform: Platform.OS === 'web' ? 'web' : Platform.OS === 'ios' ? 'iOS' : 'Android',
  };
}

/** Texto pequeño con la versión, para comprobar que la app se ha actualizado bien. */
export function VersionInfo({ detailed, center }: { detailed?: boolean; center?: boolean }) {
  const v = getVersionInfo();
  const short = `Versión ${v.version}${v.commit ? ` · ${v.commit}` : ''} · ${v.platform}`;
  if (!detailed) {
    return (
      <Txt variant="small" center={center} color={colors.muted} style={{ fontSize: 11.5 }}>
        {short}
      </Txt>
    );
  }
  return (
    <>
      <Txt variant="small" center={center} color={colors.text}>
        {short}
      </Txt>
      {v.commitDate ? (
        <Txt variant="small" center={center}>
          Actualización {v.commit} del {v.commitDate}
        </Txt>
      ) : null}
      {v.builtAt ? (
        <Txt variant="small" center={center}>
          Compilada el {v.builtAt}
        </Txt>
      ) : null}
      <Txt variant="small" center={center} style={{ marginTop: 4, fontSize: 11.5 }}>
        Compara el código ({v.commit || '—'}) con el que muestra el .bat al arrancar o con el último cambio en GitHub.
      </Txt>
    </>
  );
}

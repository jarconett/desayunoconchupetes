import { LegalDoc } from '@/components/legal';
import { Card, HeroHeader, Screen, Txt } from '@/components/ui';
import { COOKIES_POLICY, COOKIES_SUMMARY, COOKIES_TITLE } from '@/lib/legal';

/** Política de cookies (accesible con o sin sesión). */
export default function PoliticaCookies() {
  return (
    <Screen header={<HeroHeader back title={COOKIES_TITLE} subtitle="Desayuno con Chupetes" />}>
      <Card>
        <Txt style={{ marginBottom: 12 }}>{COOKIES_SUMMARY}</Txt>
        <LegalDoc sections={COOKIES_POLICY} />
      </Card>
    </Screen>
  );
}

import { useProfile } from '@/hooks/use-profile';
import { translations, type TranslationKey } from '@/i18n/translations';

export function useTranslation() {
  const { profile } = useProfile();
  const language = profile.language;

  const t = (key: TranslationKey): string =>
    translations[language][key];

  return { t, language };
}
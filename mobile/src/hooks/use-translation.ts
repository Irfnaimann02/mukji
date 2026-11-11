
import { useProfile } from '@/hooks/use-profile';
import { translations, type TranslationKey } from '@/i18n/translations';

type TranslationParams = Record<string, string | number>;

export function useTranslation() {
  const { profile } = useProfile();
  const language = profile.language;

  const t = (
    key: TranslationKey,
    params?: TranslationParams
  ): string => {
    let value: string = translations[language][key];

    if (params) {
      for (const [name, replacement] of Object.entries(params)) {
        value = value.replace(
          new RegExp(`\\{${name}\\}`, 'g'),
          String(replacement)
        );
      }
    }

    return value;
  };

  return { t, language };
}

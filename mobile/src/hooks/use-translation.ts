import { useCallback } from 'react';
import { useProfile } from '@/hooks/use-profile';
import {
  ownerPortalTranslations,
  translations,
  type OwnerPortalTranslationKey,
  type TranslationKey,
} from '@/i18n/translations';

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

  const owner = useCallback(
    (
      key: OwnerPortalTranslationKey,
      params?: TranslationParams
    ): string => {
      let value: string = ownerPortalTranslations[language][key];

      if (params) {
        for (const [name, replacement] of Object.entries(params)) {
          value = value.replace(
            new RegExp(`\\{${name}\\}`, 'g'),
            String(replacement)
          );
        }
      }

      return value;
    },
    [language]
  );

  return { t, owner, language };
}

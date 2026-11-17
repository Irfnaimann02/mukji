import { Alert, Platform, type AlertButton } from 'react-native';

// Alert.alert does nothing on the web (react-native-web leaves it empty), so
// every message and every "choose an option" popup was silent in the browser,
// e.g. the Directions button never opened. Same arguments as Alert.alert.
//
// Web: no buttons or one button -> window.alert.
//      one action + Cancel       -> window.confirm.
//      two or more actions       -> window.prompt with numbered choices.
export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  if (typeof window === 'undefined') return;

  const text = message ? `${title}\n\n${message}` : title;
  const cancel = buttons?.find((b) => b.style === 'cancel');
  const actions = (buttons ?? []).filter((b) => b.style !== 'cancel');

  if (actions.length <= 1 && !cancel) {
    window.alert(text);
    actions[0]?.onPress?.();
    return;
  }

  if (actions.length <= 1) {
    if (window.confirm(actions[0]?.text ? `${text}\n\n→ ${actions[0].text}?` : text)) actions[0]?.onPress?.();
    else cancel?.onPress?.();
    return;
  }

  const choices = actions.map((b, i) => `${i + 1}. ${b.text ?? ''}`).join('\n');
  const answer = window.prompt(`${text}\n\n${choices}`, '1');
  const picked = answer === null ? undefined : actions[Number.parseInt(answer, 10) - 1];
  if (picked) picked.onPress?.();
  else cancel?.onPress?.();
}

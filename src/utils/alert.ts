import { Alert as NativeAlert, Platform, type AlertButton, type AlertOptions } from "react-native";

// React Native's Alert is a no-op on web. Keep confirmations actionable there
// without changing native dialog behaviour or running cancelled callbacks.
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    if (Platform.OS !== "web") {
      NativeAlert.alert(title, message, buttons, options);
      return;
    }
    const text = [title, message].filter(Boolean).join("\n\n");
    const cancel = buttons?.find((button) => button.style === "cancel");
    const action = buttons?.find((button) => button.style !== "cancel");
    if (cancel) {
      if (window.confirm(text)) action?.onPress?.();
      else cancel.onPress?.();
    } else {
      window.alert(text);
      action?.onPress?.();
    }
  },
};

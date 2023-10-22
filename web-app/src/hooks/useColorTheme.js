import { useCallback, useEffect, useState } from "react";

function getColorThemeFromBodyEl() {
  const bodyEl = document.querySelector("body");
  if (bodyEl.classList.contains("dark-mode")) return "dark-mode";
  else if (bodyEl.classList.contains("light-mode")) return "light-mode";
  else return "";
}

/**
 * Handles managing the state of the color theme which is set on the <body> element
 *
 * @example const [colorTheme, setColorTheme] = useColorTheme();
 * @returns {[string, Function]}
 */
export function useColorTheme(useDeviceSettings = false) {
  const [colorTheme, setColorTheme] = useState(getColorThemeFromBodyEl());

  const setColorThemeOnBodyEl = useCallback(
    (theme) => {
      if (typeof theme === "function") theme = theme(colorTheme);

      const bodyEl = document.querySelector("body");
      if (bodyEl.classList.contains("dark-mode") && theme !== "dark-mode") bodyEl.classList.remove(`dark-mode`);
      if (bodyEl.classList.contains("light-mode") && theme !== "light-mode") bodyEl.classList.remove(`light-mode`);
      if (theme && !bodyEl.classList.contains(theme)) bodyEl.classList.add(theme);
      setColorTheme(theme);
    },
    [colorTheme]
  );

  function changeDeviceSettingsColorThemeEventListener({ matches }) {
    if (!useDeviceSettings) return;
    if (matches) setColorThemeOnBodyEl("dark-mode");
    else setColorThemeOnBodyEl("light-mode");
  }

  useEffect(() => {
    // add class change listener to the body element
    const bodyEl = document.querySelector("body");
    const observer = new MutationObserver(() => setColorTheme(getColorThemeFromBodyEl()));
    observer.observe(bodyEl, { attributeFilter: ["class"] });

    // allow changing by device settings (useDeviceSettings)
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", changeDeviceSettingsColorThemeEventListener);

    return () => {
      observer.disconnect();
      window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", changeDeviceSettingsColorThemeEventListener);
    };
  }, []);

  return [colorTheme, setColorThemeOnBodyEl];
}

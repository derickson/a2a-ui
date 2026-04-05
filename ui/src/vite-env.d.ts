/// <reference types="vite/client" />

declare module '*.css' {
  const content: string;
  export default content;
}

declare module '@elastic/eui-theme-borealis/dist/eui_theme_borealis_colors_dark.css';
declare module '@elastic/eui-theme-borealis/dist/eui_theme_borealis_colors_light.css';

declare module '@elastic/eui/es/components/icon/icon' {
  export function appendIconComponentCache(icons: Record<string, unknown>): void;
}

declare module '@elastic/eui/es/components/icon/assets/*' {
  export const icon: unknown;
}

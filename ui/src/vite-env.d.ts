/// <reference types="vite/client" />

declare module '*.css' {
  const content: string;
  export default content;
}

declare module '@elastic/eui-theme-borealis/dist/eui_theme_borealis_colors_dark.css';
declare module '@elastic/eui-theme-borealis/dist/eui_theme_borealis_colors_light.css';

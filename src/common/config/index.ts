import type { PartialTheme } from "@fluentui/react";

interface IConfig {
  /** 主题 */
  theme: {
    palette: PartialTheme["palette"];
  };
  /** 应用名 */
  appName: string;
  /** 应用图标 */
  appIcon: string;
  /** sqlite数据库名称 */
  dbName: string;
}

/**
 * APP配置项
 */
const config: IConfig = {
  theme: {
    palette: {
      themePrimary: "#6dad19",
      themeLighterAlt: "#f8fcf3",
      themeLighter: "#e4f2d1",
      themeLight: "#cde7ab",
      themeTertiary: "#a0ce64",
      themeSecondary: "#7bb72d",
      themeDarkAlt: "#629c16",
      themeDark: "#538412",
      themeDarker: "#3d610e",
      neutralLighterAlt: "#f8f8f8",
      neutralLighter: "#f4f4f4",
      neutralLight: "#eaeaea",
      neutralQuaternaryAlt: "#dadada",
      neutralQuaternary: "#d0d0d0",
      neutralTertiaryAlt: "#c8c8c8",
      neutralTertiary: "#595959",
      neutralSecondary: "#373737",
      neutralPrimaryAlt: "#2f2f2f",
      neutralPrimary: "#000000",
      neutralDark: "#151515",
      black: "#0b0b0b",
      white: "#ffffff",
    },
  },
  appName: "防火墙日志分析工具",
  appIcon: "public/favicon.png",
  dbName: "firewall.db",
};

export default config;

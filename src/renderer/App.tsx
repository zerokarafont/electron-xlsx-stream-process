import type { FC } from "react";
import React from "react";
import { ThemeProvider } from "@fluentui/react";
import { initializeIcons } from "@fluentui/font-icons-mdl2";
import { initializeFileTypeIcons } from "@fluentui/react-file-type-icons";
import { HtmlHead } from "@renderer/components";
import { Home } from "@renderer/pages";
import config from "@common/config";

initializeIcons();
initializeFileTypeIcons();

const App: FC = () => {
  return (
    <ThemeProvider theme={config.theme}>
      <HtmlHead />
      <Home />
    </ThemeProvider>
  );
};

export default App;

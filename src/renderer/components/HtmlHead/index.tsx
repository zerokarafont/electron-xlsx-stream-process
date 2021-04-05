import type { FC } from "react";
import React from "react";
import { Helmet } from "react-helmet";
import config from "@common/config";

export const HtmlHead: FC = () => {
  return (
    <Helmet>
      <link rel="shortcut icon" href="public/icon.ico" type="image/x-icon" />
      <title>{config.appName}</title>
    </Helmet>
  );
};

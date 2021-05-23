import type { FC } from "react";
import React from "react";
import { Helmet } from "react-helmet";
import config from "@common/config";

export const HtmlHead: FC = () => {
  return (
    <Helmet>
      <title>{config.appName}</title>
    </Helmet>
  );
};

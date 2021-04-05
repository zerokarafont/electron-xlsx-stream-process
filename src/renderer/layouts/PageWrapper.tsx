import React, { FC } from "react";

/** 基础页面布局 */
export const PageWrapper: FC = ({ children }) => {
  return (
    <div
      style={{
        boxSizing: "border-box",
        width: "100vw",
        height: "100vh",
        padding: 15,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
};

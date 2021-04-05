import React, { FC, useState, memo } from "react";

import { Stack, StackItem, IconButton } from "@fluentui/react";

/** 工具栏图标 */
export interface IToolbarItem {
  /** item的唯一标识 */
  key: string;
  /** 悬浮标题 */
  title: string;
  /** fluent图标名 */
  iconName: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否允许选中状态 */
  enableChecked?: boolean;
  /** 自定义样式 */
  style?: React.CSSProperties | undefined;
}

export interface IToolbar {
  data: IToolbarItem[];
  onClick: (item: IToolbarItem) => void;
}

export const Toolbar: FC<IToolbar> = memo(({ data, onClick }) => {
  const [current, setCurrent] = useState<number>();

  const handleClick = (item: IToolbarItem, idx: number) => {
    setCurrent(idx);
    if (onClick) onClick(item);
  };

  return (
    <>
      <Stack
        horizontal
        tokens={{
          childrenGap: 10,
        }}
      >
        {data.map((item, idx) => (
          <StackItem key={item.key}>
            <IconButton
              title={item.title}
              checked={item.enableChecked && idx === current}
              disabled={item.disabled || false}
              iconProps={{ iconName: item.iconName, style: item.style }}
              onClick={() => handleClick(item, idx)}
            />
          </StackItem>
        ))}
      </Stack>
    </>
  );
});

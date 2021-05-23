import type { FC } from "react";
import React, { memo, useCallback } from "react";
import { useDropzone, FileWithPath } from "react-dropzone";
import { Icon } from "@fluentui/react";
import {
  FileIconType,
  getFileTypeIconProps,
} from "@fluentui/react-file-type-icons";
import classNames from "classnames/bind";
import styles from "./index.module.less";

const cx = classNames.bind(styles);

export interface IDropProps {
  onDrop: <T extends FileWithPath>(acceptedFiles: T[]) => void;
}

/**
 * 原生文件拖放
 * 支持文件夹
 * 限定Excel格式 xls xlsx csv
 */
export const DropZone: FC<IDropProps> = memo(({ onDrop }) => {
  const onDropInternal = useCallback(
    (acceptedFiles: FileWithPath[]) => {
      onDrop(acceptedFiles);
    },
    [onDrop]
  );

  const {
    getRootProps,
    getInputProps,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop: onDropInternal,
    // accept: `
    // .csv,
    // text/csv,
    // application/vnd.ms-excel,
    // application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
    // `
  });

  const zoneClass = cx({
    zone: true,
    accept: isDragAccept,
    reject: isDragReject,
  });

  return (
    <>
      <div {...getRootProps({ className: zoneClass })}>
        <input {...getInputProps()} />
        <Icon
          {...getFileTypeIconProps({
            type: FileIconType.documentsFolder,
            size: 96,
            imageFileType: "svg",
          })}
        />
        <p>
          {isDragReject
            ? "检测到不支持的文件格式"
            : "拖拽多个文件或者文件夹到此处"}
        </p>
      </div>
    </>
  );
});

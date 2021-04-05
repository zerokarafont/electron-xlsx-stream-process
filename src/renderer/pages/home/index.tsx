import type { FC } from "react";
import type { IToolbarItem } from "@renderer/components";
import React, { useCallback, useState } from "react";
import { PageWrapper } from "@renderer/layouts";
import { DropZone } from "@renderer/components";
import {
  DetailsList,
  Selection,
  ProgressIndicator,
  Icon,
  IColumn,
  SelectionMode,
  DetailsListLayoutMode,
  ConstrainMode,
} from "@fluentui/react";
import { getFileTypeIconProps } from "@fluentui/react-file-type-icons";
import { FileWithPath } from "react-dropzone";
import filesize from "filesize";
import moment from "moment";
import _ from "lodash";

/** 主页 */
export const Home: FC = () => {
  const [files, setFiles] = useState<FileWithPath[]>([]);
  const [selection] = useState(new Selection());

  const handleDrop = useCallback((acceptedFiles: FileWithPath[]) => {
    setFiles(acceptedFiles);
  }, []);

  const sortColumn = (
    ev: React.MouseEvent<HTMLElement, MouseEvent>,
    column: IColumn
  ) => {
    const sortedFiles = _.orderBy(files, [column.fieldName], ["desc"]);
    setFiles(sortedFiles);
  };

  const menus: IToolbarItem[] = [];

  const columns: IColumn[] = [
    {
      name: "File Type",
      key: "file type",
      minWidth: 16,
      maxWidth: 16,
      isIconOnly: true,
      onRender: () => (
        <Icon
          {...getFileTypeIconProps({
            extension: "xlsx",
            size: 16,
            imageFileType: "svg",
          })}
        />
      ),
    },
    {
      name: "文件名",
      key: "name",
      fieldName: "name",
      minWidth: 150,
      isResizable: true,
      onColumnClick: sortColumn,
    },
    {
      name: "大小",
      key: "size",
      fieldName: "size",
      minWidth: 60,
      isResizable: true,
      onRender: (item: FileWithPath) => filesize(item.size),
    },
    {
      name: "路径",
      key: "path",
      fieldName: "path",
      minWidth: 300,
      isResizable: true,
      onColumnClick: sortColumn,
    },
    {
      name: "上次修改时间",
      key: "lastModified",
      fieldName: "lastModified",
      minWidth: 150,
      isResizable: true,
      onColumnClick: sortColumn,
      onRender: (item: FileWithPath) =>
        moment(item.lastModified).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      key: "progress",
      name: "进度",
      minWidth: 150,
      isResizable: true,
      onRender: () => <ProgressIndicator percentComplete={0} />,
    },
  ];

  return (
    <PageWrapper>
      <DropZone onDrop={handleDrop} />
      <DetailsList
        compact
        items={files}
        columns={columns}
        selection={selection}
        selectionPreservedOnEmptyClick
        selectionMode={SelectionMode.multiple}
        layoutMode={DetailsListLayoutMode.justified}
        constrainMode={ConstrainMode.unconstrained}
      />
    </PageWrapper>
  );
};

import React, { FC, useEffect, useCallback, useState } from "react";
import type { IToolbarItem } from "@renderer/components";
import type { FileWithPath } from "react-dropzone";
import { PageWrapper } from "@renderer/layouts";
import { DropZone, Toolbar } from "@renderer/components";
import { EnumTaskStatus, EventConstants } from "@common/constants";
import {
  DetailsList,
  Selection,
  ProgressIndicator,
  Icon,
  IColumn,
  Toggle,
  SelectionMode,
  DetailsListLayoutMode,
  ConstrainMode,
  MessageBar,
} from "@fluentui/react";
import { getFileTypeIconProps } from "@fluentui/react-file-type-icons";
import filesize from "filesize";
import moment from "moment";
import _ from "lodash";

/** 主页 */
export const Home: FC = () => {
  const [files, setFiles] = useState<FileWithPath[]>([]);
  const [selection] = useState(new Selection());
  const [status, setTaskStatus] = useState<EnumTaskStatus>(-1);
  const [message, setTaskMessage] = useState<string>();
  const [cacheSize, setCacheSize] = useState<string>();
  const [zipped, setIsZip] = useState<boolean>(false);
  const [percentComplete, setPercentComplete] = useState<number | undefined>(0);

  const syncTaskStatus = (
    taskStatus: EnumTaskStatus,
    msg: string | undefined
  ) => {
    setTaskStatus(taskStatus);
    setTaskMessage(msg);
  };

  const handleDrop = useCallback((acceptedFiles: FileWithPath[]) => {
    setPercentComplete(0);
    setFiles(acceptedFiles);
  }, []);

  const handlePlay = useCallback(() => {
    if (status === EnumTaskStatus.IN_PROGRESS) {
      setTaskMessage("任务正在处理中");
      return;
    }
    if (selection.getSelectedCount() === 0) {
      setTaskMessage("至少选中一项");
      return;
    }
    syncTaskStatus(EnumTaskStatus.IN_PROGRESS, "开始处理任务");
    const selectedFiles = selection.getSelection();
    const payload = (selectedFiles as FileWithPath[]).map((file) => ({
      path: file.path,
      lastModified: file.lastModified,
    }));
    setPercentComplete(undefined);
    ipc.callMain(EventConstants.START_WROKER, JSON.stringify(payload), zipped);
  }, [selection, status, zipped]);

  const handleDisconnected = useCallback(() => {
    if (status === EnumTaskStatus.IN_PROGRESS) {
      ipc.callMain(EventConstants.TERMINATE_WORKER, null);
    }
  }, [status]);

  const handleClearDBCache = useCallback(() => {
    if (status === EnumTaskStatus.IN_PROGRESS) {
      setTaskMessage("任务正在处理中");
      return;
    }
    ipc.callMain(EventConstants.CLEAR_DB_CACHE, null);
  }, [status]);

  const handleToolbarClick = useCallback(
    (item: IToolbarItem) => {
      switch (item.key) {
        case "play":
          handlePlay();
          break;
        case "plug-disconnected":
          handleDisconnected();
          break;
        case "offline-storage-solid":
          handleClearDBCache();
          break;
        default:
      }
    },
    [handlePlay, handleDisconnected, handleClearDBCache]
  );

  // 同步缓存信息
  useEffect(() => {
    ipc.callMain(EventConstants.REQUEST_DB_SIZE, null);
  }, []);

  // 设置监听事件
  useEffect(() => {
    ipc.answerMain(EventConstants.START_WROKER, (event, resp) => {
      if (resp.err) {
        setPercentComplete(0);
        syncTaskStatus(resp.status, `${resp.msg} ${resp.err}`);
        new Notification("发生错误", {
          body: `${resp.msg} ${resp.err}`,
          requireInteraction: true,
        });
        return;
      }
      setPercentComplete(1);
      syncTaskStatus(resp.status, `${resp.msg}`);
      new Notification("任务处理结束", {
        requireInteraction: true,
      });
    });
    ipc.answerMain(EventConstants.TERMINATE_WORKER, (event, resp) => {
      syncTaskStatus(resp.status, `${resp.msg} ${resp.err || ""}`);
    });
    ipc.answerMain(EventConstants.CLEAR_DB_CACHE, (event, resp) => {
      syncTaskStatus(resp.status, `${resp.msg} ${resp.err || ""}`);
      setCacheSize(resp.data as string);
    });
    ipc.answerMain(EventConstants.REQUEST_DB_SIZE, (event, resp) => {
      // syncTaskStatus(resp.status, `${resp.msg} ${resp.err || ""}`);
      setCacheSize(resp.data as string);
    });

    return () => {
      ipc.cleanup(EventConstants.START_WROKER, () => {
        console.log("cleanup start_worker listener");
      });
      ipc.cleanup(EventConstants.TERMINATE_WORKER, () => {
        console.log("cleanup terminate_worker listener");
      });
      ipc.cleanup(EventConstants.CLEAR_DB_CACHE, () => {
        console.log("cleanup clear_cache listener");
      });
      ipc.cleanup(EventConstants.REQUEST_DB_SIZE, () => {
        console.log("cleanup request_cache_size listener");
      });
    };
  }, []);

  const sortColumn = (
    ev: React.MouseEvent<HTMLElement, MouseEvent>,
    column: IColumn
  ) => {
    const sortedFiles = _.orderBy(files, [column.fieldName], ["desc"]);
    setFiles(sortedFiles);
  };

  const menus: IToolbarItem[] = [
    {
      key: "play",
      title: "开始",
      iconName: "Play",
      enableChecked: true,
    },
    {
      key: "plug-disconnected",
      title: "终止",
      iconName: "PlugDisconnected",
      enableChecked: false,
      style: {
        color: "red",
      },
    },
    {
      key: "offline-storage-solid",
      title: "清理缓存",
      iconName: "OfflineStorageSolid",
      enableChecked: false,
      style: {
        color: "red",
      },
    },
  ];

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
      key: "progress",
      name: "处理进度",
      minWidth: 150,
      isResizable: true,
      onRender: () => <ProgressIndicator percentComplete={percentComplete} />,
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
  ];

  return (
    <PageWrapper>
      <DropZone onDrop={handleDrop} />
      {message && (
        <MessageBar onDismiss={() => setTaskMessage(undefined)}>
          {message}
        </MessageBar>
      )}
      <Toolbar
        data={menus}
        cacheSize={cacheSize}
        onClick={handleToolbarClick}
      />
      <Toggle
        label="是否启用打包模式(默认会在源文件各自的源路径生成输出的csv, 启用打包会将所有输出自动生成一个zip)"
        inlineLabel
        checked={zipped}
        onChange={(event, checked) => setIsZip(!!checked)}
      />
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

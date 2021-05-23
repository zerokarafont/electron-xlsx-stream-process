import { homedir } from "os";
import { unlinkSync, existsSync, mkdirSync, rmdirSync } from "fs";
import { join, sep, parse } from "path";
import { StaticPool } from "node-worker-threads-pool";
import AdmZip from "adm-zip";
import { EventConstants, TaskNameConstants } from "@common/constants";
import { ipcMain } from "electron";
import { FileWithPath } from "react-dropzone";
import moment from "moment";
import _ from "lodash";
// import { series } from "async-es";

type Response = Promise<unknown>;

let pool: StaticPool<unknown, unknown, unknown> | null = null;

function findTaskFilePath(taskname: TaskNameConstants) {
  return join(__dirname, "task", `${taskname}.js`);
}

/**
 * 使用工作线程处理对应的任务
 * @param taskname 任务名称
 * @param params 任务参数
 * @returns Response
 */
export async function startWorkerThread(
  taskname: TaskNameConstants,
  params: FileWithPath[],
  zipped = false
): Response {
  pool = new StaticPool({
    size: 1,
    task: findTaskFilePath(taskname),
    workerData: { zipped },
    resourceLimits: {
      stackSizeMb: 20, // 默认值为4, 对于超大文件会发生Maximum call stack size exceeded
    },
  });

  if (taskname === TaskNameConstants.PARSE_LOG) {
    const promises = params.map((fileinfo) =>
      pool
        ?.exec(fileinfo)
        .then((value) => {
          if (value instanceof Error) {
            throw value;
          }
          return value;
        })
        .catch((e) => e)
    );

    // 此处的异常由promise自身处理并返回，因此不需要try catch, 而且不会中断执行流程
    // 保证异步多任务串行执行 因为SQlite DB锁导致无法并发操作
    for await (const res of promises) {
      // 混合使用事件机制 可以多任务自身单独通知，因为promise只能被fulfilled once
      if (res instanceof Error) {
        ipcMain.emit(EventConstants.WORKER_TASK_ERROR, res);
      }
    }

    if (zipped) {
      // 启用打包模式
      const filelist = params.map(({ path }) => {
        /**
         * 为了防止csv文件导出csv时候因为同名覆盖源文件, 这里约定
         * 如果源文件是csv则导出的时候在名字后加上_origin
         */
        const { ext } = parse(path!);
        if (ext === ".csv") {
          return path!.replace(/\.csv/, "_origin.csv");
        }
        return path!.replace(/\.xlsx/, ".csv");
      });

      const outpath = join(
        homedir(),
        "Desktop",
        `${moment()
          .format("YYYY-MM-DD HH:mm:ss")
          .split(" ")
          .join("-")
          .replace(":", "时")
          .replace(":", "分")
          .replace(":", "秒")}-打包`
      );
      // 保证原目录层级打包, 否则不同目录下的同名文件有问题
      const zip = new AdmZip();

      /** 将每个路径按照path.sep分隔
       * @link http://nodejs.cn/api/path.html#path_path_sep
       * @example 
       * filelist [
                'C:\\Users\\ADMIN\\Desktop\\csv\\测试同名文件\\目录一\\2mac.csv',
                'C:\\Users\\ADMIN\\Desktop\\csv\\测试同名文件\\目录二\\2mac.csv'
              ]
       */
      const splitpath = filelist.map((file) => file.split(sep));
      // 提取公共的目录
      let parentFolder = _.intersection(...splitpath).join(sep);
      if (parentFolder.includes(".csv")) {
        // 如果出现同名文件则去除{file}.{ext}
        const tmpArr = parentFolder.split(sep);
        tmpArr.pop();
        parentFolder = tmpArr.join(sep);
      }
      mkdirSync(outpath);
      try {
        filelist.forEach((file) => {
          if (existsSync(file)) {
            // 每个文件去除公共父目录后自己独有的路径
            const uniquePathWithFileSuffix = file.split(parentFolder)[1];
            let uniquePathRemoveFileSuffix = uniquePathWithFileSuffix;
            const uniquePathRemoveFileSuffixArr = uniquePathRemoveFileSuffix.split(
              sep
            );
            // 弹出{file}.{ext}
            uniquePathRemoveFileSuffixArr.pop();
            // 压缩包中的子路径
            uniquePathRemoveFileSuffix = uniquePathRemoveFileSuffixArr.join(
              sep
            );
            /**
             * FIXME: 中文目录名会导致文件没有全打包的问题, 比如下面的结构会打包不全
             * @example
             * 父目录
             * ------------目录一
             * ------------------test.csv
             * ------------目录二
             * -----------------test.csv
             * -----------------目录二
             * ----------------------test.csv
             */
            zip.addLocalFile(file, uniquePathRemoveFileSuffix);
          }
        });
        await new Promise((resolve, reject) => {
          zip.writeZip(`${outpath}.zip`, (err: Error | null) => {
            if (err) reject(err);
            resolve(true);
          });
        });

        // FIXME: 中文目录乱码 需要修改adm-zip源码
        // const fixzip = new AdmZip(`${outpath}.zip`);
        // fixzip.getEntries().forEach((entry) => {
        //   console.log(
        //     "编码",
        //     jschardet.detect(entry.entryName),
        //     entry.entryName
        //   );
        //   console.log(
        //     "编码raw",
        //     jschardet.detect(entry.rawEntryName),
        //     entry.rawEntryName
        //   );
        // });

        // eslint-disable-next-line no-useless-catch
      } catch (e) {
        throw e;
      } finally {
        // 删除创建的临时目录
        rmdirSync(outpath);
        // 删除不需要的文件
        filelist.forEach((file) => {
          if (existsSync(file)) unlinkSync(file);
        });
      }
    }
    return Promise.resolve(true);
  }

  return Promise.reject(new Error("没有找到对应的任务"));
}

/**
 * 终止工作线程并释放资源
 * @returns
 */
export async function terminateWorkerThread(): Promise<never | string> {
  if (pool) {
    // 1. 停止流
    // 2. 删除数据表
    // 3. 释放数据库连接
    // dummy operate
    return Promise.resolve("任务正在处理中, 无法强制终止");

    // TODO:
    // 4. 释放线程池 直接释放会导致应用crash
    // return pool.destroy();
  }
  return Promise.reject(new Error("空线程池"));
}

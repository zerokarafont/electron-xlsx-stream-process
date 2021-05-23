import type { FileWithPath } from "react-dropzone";
import os from "os";
import fs from "fs";
import stream from "stream";
import readline from "readline";
import { parse, resolve } from "path";
import { promisify } from "util";
import { parentPort } from "worker_threads";
import { getXlsxStreams, getWorksheets } from "xlstream";
import {
  promisifyWrite,
  SqliteWriteStream,
  sqliteExportCSV,
  isFileAlreadInDB,
  genMD5Checksum,
  sanitizeFilepath,
} from "@common/utils";
import config from "@common/config";
import { setFileMD5 } from "@main/storage";
import { processLog } from "./transformLog";

const finished = promisify(stream.finished);

export interface SheetRecord {
  raw: {
    obj: Record<string, unknown>;
    arr: unknown[];
  };
  formatted: {
    obj: Record<string, unknown>;
    arr: unknown[];
  };
  header: [];
}

/**
 * 分析日志文件
 * 抽出源IP， 目的IP， 目的端口， 匹配次数 区分内网/公网
 * @param {string} path 本地文件路径
 */
async function parseExcel(path: string, lastModified: number) {
  const { ext } = parse(path);
  const databasePath = resolve(os.tmpdir(), config.dbName);
  const tableName = `table_${lastModified}_${sanitizeFilepath(path)}`;

  const writeableStream = new SqliteWriteStream({
    databasePath,
    tableName,
  });

  const write = promisifyWrite(writeableStream);

  try {
    if (ext.includes("csv")) {
      const rl = readline.createInterface({
        input: fs.createReadStream(path),
      });

      let index = 0;
      for await (const line of rl) {
        // 跳过首行 此为业务相关
        if (index !== 0) {
          const obj = processLog(line.split(","));
          await write([obj]);
        }
        index += 1;
      }
    } else if (ext.includes("xlsx")) {
      const sheetNames = await getWorksheets({ filePath: path });
      const asyncGenerator = getXlsxStreams({
        filePath: path,
        sheets: sheetNames.map(({ name: n }) => ({ id: n, ignoreEmpty: true })),
      });

      for await (const sheetStream of asyncGenerator) {
        let index = 0;
        for await (const chunk of sheetStream) {
          const {
            raw: { arr },
          } = chunk as SheetRecord;

          if (index !== 0) {
            // 跳过首行 此为业务相关

            const obj = processLog(arr);
            await write([obj]);
          }
          index += 1;
        }

        await finished(sheetStream);
      }
    } else {
      throw new Error("不支持的文件格式, 请使用xlsx或者csv");
    }

    writeableStream.end();
    await finished(writeableStream);

    return Promise.resolve("over");
  } catch (e) {
    return Promise.reject(new Error(`${e.message} ${path}`));
  }
}

parentPort!.on("message", async (fileinfo: FileWithPath) => {
  const { path: filepath, lastModified } = fileinfo;
  if (!filepath) {
    throw new Error("Missing filepath param");
  }
  if (!fs.existsSync(filepath)) {
    throw new Error(`找不到文件路径${filepath}`);
  }

  try {
    const IS_IN_DB = await isFileAlreadInDB(filepath, lastModified);
    if (!IS_IN_DB) {
      console.time("data import");
      await parseExcel(filepath, lastModified);
      console.timeEnd("data import");
      // 记录缓存key
      const key = sanitizeFilepath(filepath) + lastModified;
      const hash = await genMD5Checksum(filepath);
      await setFileMD5(key, hash);
    }

    console.log("开始导出csv");
    console.time("csv export");
    await sqliteExportCSV(filepath, lastModified);
    console.timeEnd("csv export");

    parentPort!.postMessage("over");
  } catch (e) {
    parentPort!.postMessage(new Error(e.message));
  }
});

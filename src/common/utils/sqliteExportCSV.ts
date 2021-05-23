import os from "os";
import fs from "fs";
import path from "path";
import stream from "stream";
import { promisify } from "util";
import { Database, verbose } from "sqlite3";
import { sanitizeFilepath } from "@common/utils";
import config from "@common/config";

verbose();
const finished = promisify(stream.finished);

// 表头
export const head = [
  "源IP",
  "目的IP",
  "目的端口",
  "访问频率",
  "去向(内网or外网)",
  os.EOL,
];

export async function sqliteExportCSV(
  filepath: string,
  lastModified: number
): Promise<void> {
  const table = `table_${lastModified}_${sanitizeFilepath(filepath)}`;
  const databasePath = path.resolve(os.tmpdir(), config.dbName);

  const db = new Database(databasePath, (err: Error | null) => {
    if (err) Promise.reject(err);
  });
  db.configure("busyTimeout", 3000);
  db.run("PRAGMA journal_mode = WAL;");
  db.run("PRAGMA synchronous = OFF;");

  async function promisifyGet(
    sql: string
  ): Promise<Array<Record<string, unknown>>> {
    return new Promise((resolve, reject) => {
      db.all(sql, (err: Error | null, row: Array<Record<string, unknown>>) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  }

  const LIMIT = 1000;
  const sqlTemp = `SELECT A, B, C, COUNT(*) as fre, D FROM {{table}} as t GROUP BY t.B, t.C ORDER BY fre DESC LIMIT {{limit}} OFFSET {{offset}}`
    .replace("{{table}}", table)
    .replace("{{limit}}", String(LIMIT));
  // 查询所有同一 (destip + destport) 所对应的 sourceip
  const sqlSourceIPTemp = `SELECT DISTINCT A FROM {{table}} as t WHERE t.B = {{dest_ip}} AND t.C = {{dest_port}}`.replace(
    "{{table}}",
    table
  );

  /**
   * 为了防止csv文件导出csv时候因为同名覆盖源文件, 这里约定
   * 如果源文件是csv则导出的时候在名字后加上_origin
   */
  let outpath = null;
  const { ext } = path.parse(filepath);
  if (ext === ".csv") {
    outpath = filepath.replace(/\.csv/, "_orgin.csv");
  } else {
    outpath = filepath.replace(/\.xlsx/, ".csv");
  }
  const writeablestream = fs.createWriteStream(outpath);
  // FIXME: 为什么此write写法, cpu不会调用？ 只能用db.get才工作，db.all的模式, cpu不动?
  // const write = promisifyWrite(writeablestream);

  // 写入表头
  writeablestream.write(head.join(","));

  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const rows = await promisifyGet(
      sqlTemp.replace("{{offset}}", String(offset))
    );
    if (!rows.length) break;

    const records = [];
    for (const record of rows) {
      const arr = [];
      for (const key of Object.keys(record)) {
        if (key === "A") {
          const sourceIPList = await promisifyGet(
            sqlSourceIPTemp
              .replace("{{dest_ip}}", `'${record.B}'`)
              .replace("{{dest_port}}", String(record.C))
          );
          const res = sourceIPList.map(({ A }) => A).join("、");
          arr.push(res);
        } else {
          arr.push(record[key]);
        }
      }

      records.push(arr.join(","));
    }

    const batchWrite = records.join(os.EOL).concat(os.EOL);

    writeablestream.write(batchWrite, (err: Error | null | undefined) => {
      if (err) Promise.reject(err);
    });
    offset += LIMIT;
  }

  writeablestream.end();
  await finished(writeablestream);
  await promisify(db.close);

  return Promise.resolve();
}

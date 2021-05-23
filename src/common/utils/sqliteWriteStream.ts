import type { Database, Statement } from "sqlite3";
import { parentPort } from "worker_threads";
import sqlite3 from "sqlite3";
import { Writable } from "stream";

const Sqlite3 = sqlite3.verbose();

export type nodeCallback = (err: Error | null, data?: any) => void;
export interface IParsedObject {
  [header: string]: string | number;
}

export interface ISqliteStreamOptions {
  databasePath?: string;
  tableName?: string;
  insertTemplate?: string;
  createTemplate?: string;
  isTableCreated?: boolean;
}

/**
 * 流式数据写入sqlite
 * @export
 * @class SqliteWriteStream
 * @extends {Writable}
 */
export class SqliteWriteStream extends Writable {
  private insertTemplate =
    "INSERT INTO {{table}} ({{columns}}) VALUES ({{values}});";

  private createTemplate =
    "CREATE TABLE IF NOT EXISTS {{table}} ({{columnTypes}});";

  private isCreateSqlReady = false;

  private isInsertSqlReady = false;

  private isTableCreated = false;

  private databasePath = `${__dirname}/output.db`;

  private tableName = "parsed_tsv";

  private db: Database;

  private insertStatement?: Statement;

  constructor(options?: ISqliteStreamOptions) {
    super({ objectMode: true, highWaterMark: 1024 });
    if (options) {
      const {
        insertTemplate,
        tableName,
        createTemplate,
        databasePath,
        isTableCreated,
      } = options;
      if (tableName) {
        this.tableName = tableName;
      }
      if (databasePath) {
        this.databasePath = databasePath;
      }
      if (isTableCreated) {
        this.isTableCreated = isTableCreated;
      }
      if (insertTemplate) {
        this.insertTemplate = insertTemplate;
        this.isInsertSqlReady = true;
      }
      if (createTemplate) {
        this.createTemplate = createTemplate;
        this.isCreateSqlReady = true;
      }
    }
    // 使用缓存的数据库连接 防止在多个worker中重复打开数据库
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this.db = new Sqlite3.Database(
      this.databasePath,
      function openCachedDBError(this: Database, err: Error | null) {
        if (err) self.emit("error", err);
      }
    );
    // 提升读写速度, 尽可能减少SQLite_BUSY错误
    this.db.configure("busyTimeout", 3000);
    this.db.run("PRAGMA journal_mode = WAL;");
    this.db.run("PRAGMA synchronous = OFF;");
  }

  public _write(
    chunk: IParsedObject[],
    encoding: string,
    callback: nodeCallback
  ): void {
    if (!this.isTableCreated) {
      let createSql = this.createTemplate;
      if (!this.isCreateSqlReady) {
        createSql = this._makeCreateSql(chunk[0]);
      }
      console.log(`开始创建表:\n ${createSql}`);
      this.db.exec(createSql);
      console.log("创建索引");
      this.db.exec(
        `CREATE INDEX index_${this.tableName} ON ${this.tableName} ("B","C")`
      );
      console.log("插入数据");
      this.db.exec("BEGIN");
      this.isTableCreated = true;
    }
    let insertSql = this.insertTemplate;
    if (!this.isInsertSqlReady) {
      insertSql = this._makeInsertSql(chunk[0]);
    }
    // console.log(`开始插入值:\n ${insertSql}`);
    this.insertStatement = this.db.prepare(insertSql);

    for (const item of chunk) {
      this.insertStatement.run((err: Error | null) => {
        if (err) {
          callback(err);
        }
      });
    }

    callback(null);
  }

  public _final(callback: nodeCallback): void {
    this.db.exec("COMMIT", (err: Error | null) => {
      if (err) {
        callback(err);
        return;
      }
      // 关闭数据库前释放statement
      this.insertStatement!.finalize(callback);
      this.db.close(callback);
    });
  }

  private _makeCreateSql(example: IParsedObject): string {
    const columns = Object.keys(example);

    const columnTypes = columns.reduce((acc, item, index) => {
      let type = index === 0 ? `\`${item}\` ` : `,\`${item}\` `;
      const value = example[item];
      if (typeof value === "number") {
        type += value % 1 === 0 ? "INTEGER" : "REAL";
      } else {
        type += "TEXT";
      }
      const columnGen = acc + type;
      return columnGen;
    }, "");

    let sql = this.createTemplate.replace("{{table}}", this.tableName);
    sql = sql.replace("{{columnTypes}}", columnTypes);

    return sql;
  }

  private _makeInsertSql(example: IParsedObject): string {
    const columns = Object.keys(example);
    let sql = this.insertTemplate.replace("{{table}}", this.tableName);
    sql = sql.replace("{{columns}}", columns.map((x) => `\`${x}\``).join());
    const values = columns
      .map((x) =>
        typeof example[x] === "number" ? example[x] : `'${example[x]}'`
      )
      .join();
    sql = sql.replace("{{values}}", values);
    return sql;
  }
}

process.on("uncaughtException", (err) => {
  parentPort?.postMessage(new Error(err.message));
});

process.on("unhandledRejection", (err) => {
  if (err) parentPort?.postMessage(new Error("[unhandledSQLiteRejection]"));
});

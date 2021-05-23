import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

interface IPkg {
  binary: {
    // eslint-disable-next-line camelcase
    napi_versions: number[];
    [field: string]: unknown;
  };
  [field: string]: unknown;
}

/**
 * sqlite3包中binary总的napi_versions字段
 * 为了兼容低版本的node而使用了N-API3
 * N-API3不支持多线程，会导致sqlite在worker_thread中运行crash
 * 此脚本修改sqlite3的package.json > binary > napi_versions -> [6]
 */
function modifySqlitePackageField(): void {
  const pkgJsonPath = resolve(
    __dirname,
    "..",
    "node_modules",
    "sqlite3",
    "package.json"
  );

  const json: IPkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));

  json.binary.napi_versions = [6];

  writeFileSync(pkgJsonPath, JSON.stringify(json, null, 2));
}

modifySqlitePackageField();

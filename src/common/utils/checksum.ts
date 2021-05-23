import os from "os";
import path, { parse } from "path";
import { existsSync } from "fs";

import md5File from "md5-file";
import sanitize from "sanitize-filename";
import config from "@common/config";
import { clearMD5Storage, getFileMD5 } from "@main/storage";
// import { webContents } from "electron";

// /**
//  * 清理localstorage中存放的文件md5
//  * @deprecated 无法在工作线程中调用
//  */
// export function clearMD5Storage(): void {
//   webContents
//     .fromId(global.webContentID)
//     .executeJavaScript("localStorage.clear()");
// }

// /**
//  * 将文件的MD5 hash存入localstorage中
//  * @param filepath 文件路径
//  * @param md5 hash值
//  * @deprecated 无法在工作线程中调用
//  */
// export function setFileMD5(filepath: string, md5: string): void {
//   webContents
//     .fromId(global.webContentID)
//     .executeJavaScript(`localStorage.setItem(${filepath}, ${md5})`);
// }

// /**
//  * 从localstorage中获取文件的md5
//  * @param filepath 文件路径
//  * @returns
//  * @deprecated 无法在工作线程中调用
//  */
// export async function getFileMD5(filepath: string): Promise<unknown> {
//   return webContents
//     .fromId(global.webContentID)
//     .executeJavaScript(`localStorage.getItem(${filepath})`);
// }

export function sanitizeFilepath(filepath: string): string {
  const { dir, name } = parse(filepath);
  // FIX: sanitize并没有替换掉 . 和 -
  return sanitize(dir + name)
    .replace(/-/g, "")
    .replace(/\./g, "");
}

/**
 * 生成文件MD5 hash
 * @param filepath 文件路径
 * @returns hash值
 */
export async function genMD5Checksum(filepath: string): Promise<string> {
  // 如果数据库已经被删除
  const dbpath = path.resolve(os.tmpdir(), config.dbName);
  if (!existsSync(dbpath)) {
    clearMD5Storage();
  }

  const hash = await md5File(filepath);

  return hash;
}

/**
 * 文件数据是否已经入库, 如果入库返回
 * @param filepath 文件路径
 * @returns {boolean}
 */
export async function isFileAlreadInDB(
  filepath: string,
  lastModified: number
): Promise<boolean> {
  const key = sanitizeFilepath(filepath) + lastModified;
  const foundFileHash = await getFileMD5(key);
  const newHash = await genMD5Checksum(filepath);

  // 如果旧文件被删除， 新文件(实际上是内容不同的文件)的filename文件全路径又刚好与旧文件完全一致
  // 所以只要last modified time 不一致, 一律视为新文件
  // FIXME: 最简单的方法是使用chokidar监听文件变化， 然后同步更新缓存
  // TODO: 待重构
  if (foundFileHash === newHash) return true;

  return false;
}

import type { Writable } from "stream";
import { once } from "events";

/**
 * promise化可写流chunk
 * @param stream 可写流
 * @returns 抛出异常 (chunk: Buffer) => Promise<never>
 * @returns 写入chunk成功 (chunk: Buffer) => Promise<boolean>
 * @returns 等待缓冲区释放 (chunk: Buffer) => Promise<any[]>
 * @link Typescript条件类型 https://artsy.github.io/blog/2018/11/21/conditional-types-in-typescript/
 */
export function promisifyWrite(
  stream: Writable
): (
  chunk: Buffer | Record<string, unknown> | Array<Record<string, unknown>> | any
) => Promise<boolean | any[]> {
  let streamError: any = null;

  stream.on("error", (error) => {
    streamError = error;
  });

  return (
    chunk: Buffer | Record<string, unknown> | Array<Record<string, unknown>>
  ) => {
    if (streamError) {
      return Promise.reject(streamError);
    }
    const res = stream.write(chunk);
    if (res) {
      return Promise.resolve(true);
    }
    return once(stream, "once");
  };
}

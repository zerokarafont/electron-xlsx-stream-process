import _ from "lodash";
import isPrivateIp from "private-ip";
import type { SheetRecord } from "./parseLog";

export enum ExtractHead {
  SOURCE_IP,
  SOURCE_PORT,
  DEST_IP,
  DEST_PORT,
}

// FIXME: 不考虑超出26列的情况
/** 英文字母表 */
export const Alphabet = Array.from(_.range(65, 65 + 26), (charCode) =>
  String.fromCharCode(charCode)
);

// 抽取N~Q列 即 [源地址, 源端口, 目的地址, 目的端口]
const needRow = ["N", "O", "P", "Q"].map((letter) =>
  Alphabet.findIndex((v) => v === letter)
);

export function processLog(
  arr: SheetRecord["raw"]["arr"]
): Record<string, unknown> {
  const extractData = arr.filter((_, idx) => needRow.includes(idx));

  // 源ip最后8位归零为一个C类网段
  const sourceIP = extractData[ExtractHead.SOURCE_IP] as string;
  const temp = sourceIP.split(".");
  temp.pop();
  const network = temp.join("."); // 网络位
  const host = 0; // 主机位
  const mask = 24; // 子网掩码
  const sourceIPStr = `${network}.${host}/${mask}`;

  const combineArr = [
    sourceIPStr, // 源IP
    extractData[ExtractHead.DEST_IP], // 目的IP
    extractData[ExtractHead.DEST_PORT], // 目的端口
    isPrivateIp(extractData[ExtractHead.DEST_IP] as string) ? "内网" : "公网", // 内网 or 公网 ip
  ];

  const obj = combineArr.reduce<Record<string, unknown>>(
    (prev, next, index) => {
      // eslint-disable-next-line no-param-reassign
      prev[Alphabet[index]] = next;
      return prev;
    },
    {}
  );

  return obj;
}

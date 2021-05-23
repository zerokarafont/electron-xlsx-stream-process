/* eslint-disable no-restricted-globals */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-plusplus */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-param-reassign */
/* eslint-disable no-multi-assign */
/* eslint-disable @typescript-eslint/no-var-requires */
import fclone from "fclone";
import path from "path";
import ssf from "ssf";
import { Transform } from "stream";
import { ReadStream } from "tty";

import {
  IMergedCellDictionary,
  IWorksheet,
  IWorksheetOptions,
  IXlsxStreamOptions,
  IXlsxStreamsOptions,
  numberFormatType,
} from "./types";

const StreamZip = require("node-stream-zip");
const saxStream = require("sax-stream");
const rename = require("deep-rename-keys");

function lettersToNumber(letters: string) {
  return letters.split("").reduce((r, a) => r * 26 + parseInt(a, 36) - 9, 0);
}

function numbersToLetter(number: number) {
  let colName = "";
  let dividend = Math.floor(Math.abs(number));
  let rest: number;

  while (dividend > 0) {
    rest = (dividend - 1) % 26;
    colName = String.fromCharCode(65 + rest) + colName;
    // eslint-disable-next-line radix
    dividend = parseInt(`${(dividend - rest) / 26}`);
  }
  return colName;
}

function applyHeaderToObj(obj: any, header: any) {
  if (!header || !header.length) {
    return obj;
  }
  const newObj: { [key: string]: any } = {};
  for (const columnName of Object.keys(obj)) {
    const index = lettersToNumber(columnName) - 1;
    newObj[header[index]] = obj[columnName];
  }
  return newObj;
}

function fillMergedCells(
  dict: IMergedCellDictionary,
  currentRowName: any,
  arr: any,
  obj: any,
  formattedArr: any,
  formattedObj: any
) {
  for (const columnName of Object.keys(dict[currentRowName])) {
    const parentCell = dict[currentRowName][columnName].parent;
    const index = lettersToNumber(columnName) - 1;
    arr[index] = obj[columnName] =
      dict[parentCell.row][parentCell.column].value.raw;
    formattedArr[index] = formattedObj[columnName] =
      dict[parentCell.row][parentCell.column].value.formatted;
  }
}

function formatNumericValue(attr: string, value: any) {
  if (attr === "inlineStr" || attr === "s") {
    return value;
  }
  return isNaN(value) ? value : Number(value);
}

function getTransform(
  formats: (string | number)[],
  strings: string[],
  dict?: IMergedCellDictionary,
  withHeader?: boolean | number,
  ignoreEmpty?: boolean,
  numberFormat?: numberFormatType
) {
  let lastReceivedRow = 0;
  const header: any[] = [];
  return new Transform({
    objectMode: true,
    highWaterMark: 2048,
    transform(chunk, encoding, done) {
      const arr: any[] = [];
      const formattedArr = [];
      const obj: any = {};
      const formattedObj: any = {};
      const record = rename(fclone(chunk.record), (key: string) => {
        const keySplit = key.split(":");
        const tag = keySplit.length === 2 ? keySplit[1] : key;
        return tag;
      });
      const children = record.children
        ? record.children.c.length
          ? record.children.c
          : [record.children.c]
        : [];
      lastReceivedRow = record.attribs?.r || lastReceivedRow + 1;
      for (let i = 0; i < children.length; i++) {
        const ch = children[i];
        if (ch.children) {
          let value: any;
          const type = ch.attribs?.t;
          const columnName = ch.attribs?.r;
          const formatId = ch.attribs?.s ? Number(ch.attribs.s) : 0;
          if (type === "inlineStr") {
            value = ch.children.is.children.t.value;
          } else {
            value = ch.children.v.value;
            if (type === "s") {
              value = strings[value];
            }
          }
          value = formatNumericValue(type, value);
          const column = columnName
            ? columnName.replace(/[0-9]/g, "")
            : numbersToLetter(i + 1);
          const index = lettersToNumber(column) - 1;
          if (dict?.[lastReceivedRow]?.[column]) {
            dict[lastReceivedRow][column].value.raw = value;
          }
          arr[index] = value;
          obj[column] = value;
          if (formatId) {
            let numFormat = formats[formatId];
            if (
              numberFormat &&
              numberFormat === "excel" &&
              typeof numFormat === "number" &&
              excelNumberFormat[numFormat]
            ) {
              numFormat = excelNumberFormat[numFormat];
            } else if (numberFormat && typeof numberFormat === "object") {
              numFormat = numberFormat[numFormat];
            }
            value = ssf.format(numFormat, value);
            value = formatNumericValue(type, value);
          }
          if (dict?.[lastReceivedRow]?.[column]) {
            dict[lastReceivedRow][column].value.formatted = value;
          }
          formattedArr[index] = value;
          formattedObj[column] = value;
        }
      }
      if (dict?.[lastReceivedRow]) {
        fillMergedCells(
          dict,
          lastReceivedRow,
          arr,
          obj,
          formattedArr,
          formattedObj
        );
      }
      if (
        ((typeof withHeader === "number" &&
          withHeader === lastReceivedRow - 1) ||
          (typeof withHeader !== "number" && withHeader)) &&
        !header.length
      ) {
        for (let i = 0; i < arr.length; i++) {
          const hasDuplicate = arr.filter((x) => x === arr[i]).length > 1;
          header[i] = hasDuplicate
            ? `[${numbersToLetter(i + 1)}] ${arr[i]}`
            : arr[i];
        }
        done();
      } else {
        done(
          undefined,
          ignoreEmpty && !arr.length
            ? null
            : {
                raw: {
                  obj: applyHeaderToObj(obj, header),
                  arr,
                },
                formatted: {
                  obj: applyHeaderToObj(formattedObj, header),
                  arr: formattedArr,
                },
                header,
              }
        );
      }
    },
    flush(callback) {
      if (dict) {
        const unprocessedRows = Object.keys(dict)
          .map((x) => Number(x))
          .filter((x) => x > lastReceivedRow);
        for (const unprocessedRow of unprocessedRows) {
          const arr: any[] = [];
          const formattedArr: any[] = [];
          const obj: any = {};
          const formattedObj: any = {};
          fillMergedCells(
            dict,
            unprocessedRow,
            arr,
            obj,
            formattedArr,
            formattedObj
          );
          this.push(
            ignoreEmpty && !arr.length
              ? null
              : {
                  raw: {
                    obj: applyHeaderToObj(obj, header),
                    arr,
                  },
                  formatted: {
                    obj: applyHeaderToObj(formattedObj, header),
                    arr: formattedArr,
                  },
                  header,
                }
          );
        }
      }
      callback();
    },
  });
}

export async function getXlsxStream(
  options: IXlsxStreamOptions
): Promise<Transform> {
  const generator = getXlsxStreams({
    filePath: options.filePath,
    sheets: [
      {
        id: options.sheet,
        withHeader: options.withHeader,
        ignoreEmpty: options.ignoreEmpty,
        fillMergedCells: options.fillMergedCells,
        numberFormat: options.numberFormat,
      },
    ],
  });
  const stream = await generator.next();
  return stream.value;
}
export async function* getXlsxStreams(
  options: IXlsxStreamsOptions
): AsyncGenerator<Transform> {
  const sheets: { relsId: string; name: string }[] = [];
  const rels: { [id: string]: string } = {};
  const numberFormats: any = {};
  const formats: (string | number)[] = [];
  const strings: string[] = [];
  const zip = new StreamZip({
    file: options.filePath,
    storeEntries: true,
  });
  let currentSheetIndex = 0;
  function setupGenericData() {
    return new Promise((resolve, reject) => {
      function processSharedStrings(
        numberFormats: any,
        formats: (string | number)[]
      ) {
        for (let i = 0; i < formats.length; i++) {
          const format = numberFormats[formats[i]];
          if (format) {
            formats[i] = format;
          }
        }
        zip.stream("xl/sharedStrings.xml", (err: any, stream: ReadStream) => {
          if (stream) {
            stream
              .pipe(
                saxStream({
                  strict: true,
                  tag: ["x:si", "si"],
                })
              )
              .on("data", (x: any) => {
                const { record } = x;
                if (record.children.t) {
                  strings.push(record.children.t.value);
                } else if (!record.children.r.length) {
                  strings.push(record.children.r.children.t.value);
                } else {
                  let str = "";
                  for (let i = 0; i < record.children.r.length; i++) {
                    str += record.children.r[i].children.t.value;
                  }
                  strings.push(str);
                }
              });
            stream.on("end", () => {
              // @ts-ignore
              resolve();
            });
          } else {
            // @ts-ignore
            resolve();
          }
        });
      }

      function processStyles() {
        zip.stream(`xl/styles.xml`, (err: any, stream: ReadStream) => {
          if (stream) {
            stream
              .pipe(
                saxStream({
                  strict: true,
                  tag: ["x:cellXfs", "x:numFmts", "cellXfs", "numFmts"],
                })
              )
              .on("data", (x: any) => {
                if (
                  (x.tag === "numFmts" || x.tag === "x:numFmts") &&
                  x.record.children
                ) {
                  const children = x.record.children.numFmt.length
                    ? x.record.children.numFmt
                    : [x.record.children.numFmt];
                  for (let i = 0; i < children.length; i++) {
                    numberFormats[Number(children[i].attribs.numFmtId)] =
                      children[i].attribs.formatCode;
                  }
                } else if (
                  (x.tag === "cellXfs" || x.tag === "x:cellXfs") &&
                  x.record.children
                ) {
                  for (let i = 0; i < x.record.children.xf.length; i++) {
                    const ch = x.record.children.xf[i];
                    formats[i] = Number(ch.attribs.numFmtId);
                  }
                }
              });
            stream.on("end", () => {
              processSharedStrings(numberFormats, formats);
            });
          } else {
            processSharedStrings(numberFormats, formats);
          }
        });
      }

      function processWorkbook() {
        zip.stream("xl/workbook.xml", (err: any, stream: ReadStream) => {
          stream
            .pipe(
              saxStream({
                strict: true,
                tag: ["x:sheet", "sheet"],
              })
            )
            .on("data", (x: any) => {
              const { attribs } = x.record;
              sheets.push({ name: attribs.name, relsId: attribs["r:id"] });
            });
          stream.on("end", () => {
            processStyles();
          });
        });
      }

      function getRels() {
        zip.stream(
          "xl/_rels/workbook.xml.rels",
          (err: any, stream: ReadStream) => {
            stream
              .pipe(
                saxStream({
                  strict: true,
                  tag: ["x:Relationship", "Relationship"],
                })
              )
              .on("data", (x: any) => {
                rels[x.record.attribs.Id] = path.basename(
                  x.record.attribs.Target
                );
              });
            stream.on("end", () => {
              processWorkbook();
            });
          }
        );
      }

      zip.on("ready", () => {
        getRels();
      });
      zip.on("error", (err: any) => {
        reject(new Error(err));
      });
    });
  }
  function getMergedCellDictionary(sheetFileName: string) {
    return new Promise<IMergedCellDictionary>((resolve) => {
      zip.stream(
        `xl/worksheets/${sheetFileName}`,
        (err: any, stream: ReadStream) => {
          const dict: IMergedCellDictionary = {};
          const readStream = stream.pipe(
            saxStream({
              strict: true,
              tag: ["x:mergeCell", "mergeCell"],
            })
          );
          readStream.on("end", () => {
            resolve(dict);
          });
          readStream.on("data", (a: any) => {
            const { record } = a;
            const mergedCellRange: string = record.attribs.ref;
            const mergedCellRangeSplit = mergedCellRange.split(":");
            const mergedCellRangeStart = mergedCellRangeSplit[0];
            const mergedCellRangeEnd = mergedCellRangeSplit[1];
            const columnLetterStart = mergedCellRangeStart.replace(
              /[0-9]/g,
              ""
            );
            const columnNumberStart = lettersToNumber(columnLetterStart);
            const rowNumberStart = Number(
              mergedCellRangeStart.replace(columnLetterStart, "")
            );
            const columnLetterEnd = mergedCellRangeEnd.replace(/[0-9]/g, "");
            const columnNumberEnd = lettersToNumber(columnLetterEnd);
            const rowNumberEnd = Number(
              mergedCellRangeEnd.replace(columnLetterEnd, "")
            );
            for (
              let rowNumber = rowNumberStart;
              rowNumber <= rowNumberEnd;
              rowNumber++
            ) {
              for (
                let columnNumber = columnNumberStart;
                columnNumber <= columnNumberEnd;
                columnNumber++
              ) {
                const columnLetter = numbersToLetter(columnNumber);
                if (!dict[rowNumber]) {
                  dict[rowNumber] = {};
                }
                dict[rowNumber][columnLetter] = {
                  parent: {
                    column: columnLetterStart,
                    row: rowNumberStart,
                  },
                  value: { formatted: null, raw: null },
                };
              }
            }
          });
          readStream.resume();
        }
      );
    });
  }
  async function getSheetTransform(
    sheetFileName: string,
    withHeader?: boolean | number,
    ignoreEmpty?: boolean,
    fillMergedCells?: boolean,
    numberFormat?: numberFormatType
  ) {
    let dict: IMergedCellDictionary | undefined;
    if (fillMergedCells) {
      dict = await getMergedCellDictionary(sheetFileName);
    }
    return new Promise<Transform>((resolve) => {
      zip.stream(
        `xl/worksheets/${sheetFileName}`,
        (err: any, stream: ReadStream) => {
          const readStream = stream
            .pipe(
              saxStream({
                strict: true,
                tag: ["x:row", "row"],
              })
            )
            .pipe(
              getTransform(
                formats,
                strings,
                dict,
                withHeader,
                ignoreEmpty,
                numberFormat
              )
            );
          readStream.on("end", () => {
            if (currentSheetIndex + 1 === options.sheets.length) {
              zip.close();
            }
          });
          resolve(readStream);
        }
      );
    });
  }
  await setupGenericData();
  for (
    currentSheetIndex = 0;
    currentSheetIndex < options.sheets.length;
    currentSheetIndex++
  ) {
    const sheet = options.sheets[currentSheetIndex];
    const { id } = sheet;
    let sheetIndex = 0;
    if (typeof id === "number") {
      sheetIndex = id;
    } else if (typeof id === "string") {
      sheetIndex = sheets.findIndex((x) => x.name === id);
    }
    const sheetFileName = rels[sheets[sheetIndex].relsId];
    const transform = await getSheetTransform(
      sheetFileName,
      sheet.withHeader,
      sheet.ignoreEmpty,
      sheet.fillMergedCells,
      sheet.numberFormat
    );

    yield transform;
  }
}

export function getWorksheets(options: IWorksheetOptions) {
  return new Promise<IWorksheet[]>((resolve, reject) => {
    function processWorkbook() {
      zip.stream("xl/workbook.xml", (err: any, stream: ReadStream) => {
        if (err) {
          reject(err);
        }
        stream
          .pipe(
            saxStream({
              strict: true,
              tag: ["x:sheet", "sheet"],
            })
          )
          .on("data", (x: any) => {
            sheets.push({
              name: x.record.attribs.name,
              hidden: !!(
                x.record.attribs.state && x.record.attribs.state === "hidden"
              ),
            });
          });
        stream.on("end", () => {
          zip.close();
          resolve(sheets);
        });
        stream.on("error", reject);
      });
    }

    let sheets: IWorksheet[] = [];
    const zip = new StreamZip({
      file: options.filePath,
      storeEntries: true,
    });
    zip.on("ready", () => {
      processWorkbook();
    });
    zip.on("error", reject);
  });
}

export const excelNumberFormat: { [format: number]: string } = {
  14: "m/d/yyyy",
  22: "m/d/yyyy h:mm",
  37: "#,##0_);(#,##0)",
  38: "#,##0_);[Red](#,##0)",
  39: "#,##0.00_);(#,##0.00)",
  40: "#,##0.00_);[Red](#,##0.00)",
  47: "mm:ss.0",
};
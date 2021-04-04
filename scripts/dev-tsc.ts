import type {
  CompilerOptions,
  Diagnostic,
  FormatDiagnosticsHost,
} from "typescript";
import * as ts from "ttypescript";
import * as path from "path";
import * as os from "os";
import { CompileError, WatchMain, outDirMain, mainPath } from "./common";

let diagnosticErrors: Array<CompileError> = [];

const formatHost: FormatDiagnosticsHost = {
  getCanonicalFileName: (filepath) => filepath,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getNewLine: () => ts.sys.newLine,
};

function reportDiagnostic(diagnostic: Diagnostic) {
  if (!diagnostic.file || !diagnostic.start || !diagnostic.length) {
    return;
  }

  const diagnosticMessage = ts.flattenDiagnosticMessageText(
    diagnostic.messageText,
    formatHost.getNewLine()
  );
  const filepath = diagnostic.file.fileName.replace(process.cwd(), "");
  const { start } = diagnostic;
  const len = diagnostic.length;

  const linesOfCode = diagnostic.file.text.split(os.EOL);
  const line = diagnostic.file.text.substr(0, start + 1).split(os.EOL).length;
  const lineStart =
    diagnostic.file.text.substring(0, start + 1).lastIndexOf(os.EOL) + 1;
  const col = start - lineStart;

  const compileError: CompileError = {
    location: {
      column: col,
      file: filepath,
      length: len,
      line,
      lineText: linesOfCode[line - 1],
    },
    message: diagnosticMessage,
  };
  diagnosticErrors.push(compileError);
}

export const watchMain: WatchMain = (
  reportError,
  buildStart,
  buildComplete,
  notFoundTSConfig
) => {
  const configPath = path.join(mainPath, "tsconfig.json");
  if (!configPath) {
    notFoundTSConfig();
  }

  const createProgram = ts.createSemanticDiagnosticsBuilderProgram;

  const host = ts.createWatchCompilerHost(
    configPath,
    {
      sourceMap: true,
    },
    ts.sys,
    createProgram,
    reportDiagnostic,
    (
      diagnostic: Diagnostic,
      _: unknown,
      options: CompilerOptions,
      errorCount?: number
    ) => {
      if (!!errorCount && errorCount > 0) {
        reportError(diagnosticErrors);
        diagnosticErrors = [];
      } else if (diagnostic.code === 6194) {
        buildComplete(outDirMain);
      } else if (diagnostic.code === 6032 || diagnostic.code === 6031) {
        buildStart();
      }
    }
  );

  ts.createWatchProgram(host);
};

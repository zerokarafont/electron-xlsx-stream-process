/** 事件名 */
export enum EventConstants {
  /** 开启工作线程 */
  START_WROKER = "start_worker",
  /** 终止工作线程 */
  TERMINATE_WORKER = "terminate_worker",
  /** 工作线程任务出错 */
  WORKER_TASK_ERROR = "worker_task_error",
  /** 清除数据库缓存 */
  CLEAR_DB_CACHE = "clear_db_cache",
  /** 获取缓存大小信息 */
  REQUEST_DB_SIZE = "request_db_size",
}

/** 任务状态 */
export enum EnumTaskStatus {
  /** 发生错误 */
  ERROR = -2,
  /** 未开始 */
  NOT_STARTED = -1,
  /** 处理中 */
  IN_PROGRESS = 0,
  /** 成功 */
  SUCCESS = 1,
}

/** 任务名 */
export enum TaskNameConstants {
  /** 分析日志 */
  PARSE_LOG = "parseLog",
}

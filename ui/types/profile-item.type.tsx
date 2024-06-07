export enum SessionType {
  NORMAL = 'NORMAL',
  API = 'API',
}

export enum SessionStatus {
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  IMPORTED = 'IMPORTED',
  WARMUP = 'WARMUP',
  AUTOMATION_RUNNING = 'AUTOMATION_RUNNING',
}

export type WarmUpProfile = {
  _id: string
  type: SessionType
  team_name: string
  name: string
  session_id: string
  desktop_id: string
  desktop_name: string
  session_execution_id: number
  session_execution_batch_id: number
  user_id: string
  headless: boolean
  debug_port: string
  status: SessionStatus
  last_activity: string
  last_topic_of_search: string
  createdAt: string
  updatedAt: string
  last_run_success_rate: string
}

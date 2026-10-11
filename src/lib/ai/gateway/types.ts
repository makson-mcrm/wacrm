export type DataClass =
  | 'CLIENT_PERSONAL'
  | 'BANK_CONFIDENTIAL'
  | 'PUBLIC'
  | 'VERIFIED_ANONYMIZED'
  | 'SYNTHETIC'
  | 'UNKNOWN'

export type Decision = 'LOCAL_ONLY' | 'EXPLICIT_CLOUD_ALLOWED' | 'DENY'

export type ModelRoute = 'local' | 'cloud'

export interface ExecutorRequest {
  dataClass: DataClass
  route: ModelRoute
  payload: unknown
}

export interface LocalExecutor {
  available(): boolean
  run(req: ExecutorRequest): Promise<unknown>
}

export interface PolicyOptions {
  explicitCloudRule?: boolean
}

export interface DispatchResult {
  decision: Exclude<Decision, 'DENY'>
  route: ModelRoute
  output: unknown
}

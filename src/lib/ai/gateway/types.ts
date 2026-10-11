import type { McpDataClass } from '../../../../mcp-server/src/tools/data-class'

export type DataClass = McpDataClass

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
  allowSyntheticForTests?: boolean
}

export interface CloudProviderOptions extends PolicyOptions {
  dataClass?: DataClass
}

export interface DispatchResult {
  decision: Exclude<Decision, 'DENY'>
  route: ModelRoute
  output: unknown
}

import type { ExecutorRequest, LocalExecutor, ModelRoute } from './types'

export interface MockExecutorResult {
  mock: true
  route: ModelRoute
}

export class MockLocalExecutor implements LocalExecutor {
  private isAvailable: boolean

  totalCalls = 0
  localCalls = 0
  cloudCalls = 0

  constructor(available = true) {
    this.isAvailable = available
  }

  available(): boolean {
    return this.isAvailable
  }

  setAvailable(available: boolean): void {
    this.isAvailable = available
  }

  async run(req: ExecutorRequest): Promise<MockExecutorResult> {
    this.totalCalls += 1

    if (req.route === 'local') {
      this.localCalls += 1
    } else {
      this.cloudCalls += 1
    }

    return { mock: true, route: req.route }
  }
}

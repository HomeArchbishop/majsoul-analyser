export function createSerialExecutor () {
  let tail = Promise.resolve()
  return <T>(fn: () => Promise<T>): Promise<T> => {
    const run = tail.then(fn)
    // Keep the chain alive even if one job fails.
    tail = run.then(() => undefined, () => undefined)
    return run
  }
}

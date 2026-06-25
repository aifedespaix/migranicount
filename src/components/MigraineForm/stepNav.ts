export function nextStepIndex(current: number, length: number): number {
  return current >= length - 1 ? current : current + 1
}

export function prevStepIndex(current: number, length: number): number {
  return current <= 0 ? current : current - 1
}

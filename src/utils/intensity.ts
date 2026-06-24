export function intensityColor(score: number): string {
  const hue = 50 - (score / 10) * 50
  return `hsl(${hue}, 80%, 50%)`
}

export function intensityLabel(score: number): string {
  if (score <= 3) return 'Légère'
  if (score <= 6) return 'Modérée'
  if (score <= 8) return 'Forte'
  return 'Sévère'
}

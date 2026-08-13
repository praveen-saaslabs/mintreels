export function formatTimestamp(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainder = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours)}:${pad2(minutes)}:${pad2(remainder)}`;
  }

  return `${String(minutes)}:${pad2(remainder)}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

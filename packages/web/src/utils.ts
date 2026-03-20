/** 초(seconds)를 "Xh Ym" 형식 문자열로 변환 */
export function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

/** ws:// URL을 http:// URL로 변환 (메트릭 엔드포인트용) */
export function wsUrlToHttp(wsUrl: string): string {
  return wsUrl.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://')
}

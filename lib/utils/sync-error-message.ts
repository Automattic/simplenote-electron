export function getSyncErrorMessage(errorCode: number): string {
  return 413 === errorCode
    ? 'This note could not be synced because it is too large. Try removing content or splitting it into smaller notes.'
    : `This note could not be synced (error ${errorCode}). Simplenote may not be able to sync this note in its current form.`;
}

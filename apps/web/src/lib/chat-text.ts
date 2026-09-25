import { fillNameTokens } from '@ybot/shared'

/** Show a stored chat line. A missing name is "there", never the raw braces. */
export function chatText(text: string | undefined, displayName?: string | null): string {
  return fillNameTokens(text ?? '', displayName)
}

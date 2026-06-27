export function escapeImageAltText(altText: string): string {
  return altText.replace(/([\\[\]])/g, '\\$1').replace(/[\r\n]+/g, ' ');
}

export function escapeImageSrc(src: string): string {
  return src.replace(/([()])/g, '\\$1');
}

export function escapeImageTitleText(titleText: string): string {
  return titleText.replace(/([\\"])/g, '\\$1').replace(/[\r\n]+/g, ' ');
}

export function unescapeMarkdown(value: string): string {
  return value.replace(/\\([\\`*{}[\]()#+\-.!_>"])/g, '$1');
}

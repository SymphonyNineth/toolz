
export interface RenameResult {
  newName: string;
  error?: string;
}

export function calculateNewName(
  originalName: string,
  findText: string,
  replaceText: string,
  caseSensitive: boolean,
  regexMode: boolean
): RenameResult {
  if (!findText) {
    return { newName: originalName };
  }

  try {
    let regex: RegExp;

    if (regexMode) {
      // In regex mode, use the pattern directly
      const flags = caseSensitive ? "g" : "gi";
      regex = new RegExp(findText, flags);
    } else {
      // In normal mode, escape special characters
      const flags = caseSensitive ? "g" : "gi";
      const escapedFindText = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp(escapedFindText, flags);
    }

    const newName = originalName.replace(regex, replaceText);
    return { newName };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return { newName: originalName, error: errorMessage };
  }
}

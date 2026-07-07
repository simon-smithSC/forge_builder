// Human-readable variant labels shared by the block rail's variant menu and
// the drawer's "Edit {variant}" header (Rise teardown: drawer titled per
// variant, e.g. "Edit Paragraph with heading").

/** "heading+paragraph" -> "Heading + paragraph", "a" -> "Statement A". */
export function variantLabel(familyLabel: string, variant: string): string {
  if (/^[a-z]$/i.test(variant)) {
    return `${familyLabel} ${variant.toUpperCase()}`;
  }
  const spaced = variant.replace(/\+/g, " + ").replace(/\s+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function editTitle(familyLabel: string, variant: string): string {
  return `Edit ${variantLabel(familyLabel, variant)}`;
}

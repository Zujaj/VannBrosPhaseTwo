/**
 * Represents a flattened sidebar item
 */
export interface FlattenedItem {
  id: string
  label: string
  type: "doc" | "category"
  level: number
  path: string
}

/**
 * Creates a flattened sidebar item
 */
export function createFlattenedItem(
  id: string,
  label: string,
  type: "doc" | "category",
  level: number,
  path: string
): FlattenedItem {
  return { id, label, type, level, path }
}

/**
 * Formats a path ID into a readable label if one isn't provided
 */
export function formatLabel(id: string): string {
  const segments = id.split("/")
  const last = segments[segments.length - 1]
  return last.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

/**
 * Converts a Docusaurus doc id to its served route path.
 */
export function buildDocPath(id: string): string {
  const normalizedId = id.replace(/\/(README|index)$/i, "")
  return normalizedId === "" ? "/" : `/${normalizedId}`
}

/**
 * Recursively flattens a Docusaurus sidebar configuration into a linear array
 */
export function flattenSidebar(sidebarConfig: any): FlattenedItem[] {
  const result: FlattenedItem[] = []

  function flattenItems(items: any[], level = 0) {
    for (const item of items) {
      if (typeof item === "string") {
        result.push(
          createFlattenedItem(
            item,
            formatLabel(item),
            "doc",
            level,
            buildDocPath(item)
          )
        )
      } else if (item && typeof item === "object") {
        if (item.type === "doc") {
          result.push(
            createFlattenedItem(
              item.id,
              item.label || formatLabel(item.id),
              "doc",
              level,
              buildDocPath(item.id)
            )
          )
        } else if (item.type === "category") {
          result.push(
            createFlattenedItem(item.label, item.label, "category", level, "")
          )
          if (item.items && Array.isArray(item.items)) {
            flattenItems(item.items, level + 1)
          }
        }
      }
    }
  }

  const sidebar =
    sidebarConfig.tutorialSidebar ||
    (Array.isArray(sidebarConfig) ? sidebarConfig : [])
  if (sidebar) {
    flattenItems(Array.isArray(sidebar) ? sidebar : [])
  }

  return result
}

/**
 * Gets only the doc items in the correct order for generation
 */
export function getDocItems(sidebarConfig: any): FlattenedItem[] {
  return flattenSidebar(sidebarConfig).filter((item) => item.type === "doc")
}

import { useState, useCallback } from 'react'

export interface DragItem {
  id: string
  type: 'scene' | 'chapter'
  sceneId?: string
  chapterId?: string
}

export function useDragAndDrop() {
  const [draggingItem, setDraggingItem] = useState<DragItem | null>(null)

  const handleDragStart = useCallback((e: React.DragEvent, item: DragItem) => {
    setDraggingItem(item)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggingItem(null)
  }, [])

  return {
    draggingItem,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  }
}

'use client'

import { useWorkspaceStore } from '@/lib/realtime/workspace-store'

export function SocketStatusIndicator() {
  const connectionStatus = useWorkspaceStore((s) => s.connectionStatus)

  if (connectionStatus === 'connected') {
    return (
      <div
        className="flex items-center gap-2"
        aria-label="Connection status: connected"
      >
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-xs text-muted-foreground hidden sm:inline">Live</span>
      </div>
    )
  }

  if (connectionStatus === 'reconnecting') {
    return (
      <div
        className="flex items-center gap-2"
        aria-label="Connection status: reconnecting"
      >
        <span className="w-2 h-2 rounded-full bg-amber-400 status-pulse" />
        <span className="text-xs text-amber-400">Reconnecting...</span>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-2"
      aria-label="Connection status: disconnected"
    >
      <span className="w-2 h-2 rounded-full bg-red-500" />
      <span className="text-xs text-red-400">Offline</span>
    </div>
  )
}

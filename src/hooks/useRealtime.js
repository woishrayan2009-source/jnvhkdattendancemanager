import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtime(table, filter, onRecord) {
  useEffect(() => {
    let channelName = `realtime-${table}`
    if (filter) channelName += `-${JSON.stringify(filter)}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter },
        (payload) => onRecord(payload)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [table, filter])
}

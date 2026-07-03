import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function isOnline(lastSeenAt?: string | null) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 5 * 60 * 1000;
}

export function usePresenceMap(userIds: (string | null | undefined)[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean) as string[])).sort();
  const key = ids.join(",");
  return useQuery({
    queryKey: ["presence", key],
    enabled: ids.length > 0,
    refetchInterval: 60_000,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,last_seen_at")
        .in("id", ids);
      const map: Record<string, string | null> = {};
      (data ?? []).forEach((p: any) => { map[p.id] = p.last_seen_at; });
      return map;
    },
  });
}

export function PresenceDot({ lastSeenAt, size = 8 }: { lastSeenAt?: string | null; size?: number }) {
  const online = isOnline(lastSeenAt);
  return (
    <span
      title={online ? "En ligne" : "Hors ligne"}
      aria-label={online ? "En ligne" : "Hors ligne"}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: online ? "#22c55e" : "#9ca3af",
        boxShadow: online ? "0 0 0 2px rgba(34,197,94,0.25)" : "none",
        marginLeft: 6,
        verticalAlign: "middle",
      }}
    />
  );
}

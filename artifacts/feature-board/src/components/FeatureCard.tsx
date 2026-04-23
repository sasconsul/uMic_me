import { useVoteFeatureRequest, getListFeatureRequestsQueryKey, getGetFeatureBoardStatsQueryKey, FeatureRequest } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useVoterFingerprint } from "@/lib/voter-fp";
import { ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  request: FeatureRequest;
}

export function FeatureCard({ request }: FeatureCardProps) {
  const fp = useVoterFingerprint();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const voteMutation = useVoteFeatureRequest();

  const handleVote = () => {
    if (!fp) return;

    // Optimistic update
    const queryKeyAll = getListFeatureRequestsQueryKey({ status: "all" });
    const queryKeyOpen = getListFeatureRequestsQueryKey({ status: "open" });
    const queryKeyPlanned = getListFeatureRequestsQueryKey({ status: "planned" });
    const queryKeyDone = getListFeatureRequestsQueryKey({ status: "done" });
    const queryKeyNoParams = getListFeatureRequestsQueryKey();

    const updateFn = (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        requests: oldData.requests.map((r: FeatureRequest) => {
          if (r.id === request.id) {
            const willHaveVoted = !r.hasVoted;
            return {
              ...r,
              hasVoted: willHaveVoted,
              voteCount: r.voteCount + (willHaveVoted ? 1 : -1)
            };
          }
          return r;
        })
      };
    };

    queryClient.setQueryData(queryKeyAll, updateFn);
    queryClient.setQueryData(queryKeyOpen, updateFn);
    queryClient.setQueryData(queryKeyPlanned, updateFn);
    queryClient.setQueryData(queryKeyDone, updateFn);
    queryClient.setQueryData(queryKeyNoParams, updateFn);

    voteMutation.mutate(
      { id: request.id, data: { voterFingerprint: fp } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFeatureBoardStatsQueryKey() });
        },
        onError: () => {
          // Revert on error
          queryClient.invalidateQueries({ queryKey: getListFeatureRequestsQueryKey() });
          toast({
            title: "Error",
            description: "Failed to record vote. Please try again.",
            variant: "destructive",
          });
        }
      }
    );
  };

  const statusColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    planned: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    done: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  };

  return (
    <div className="group relative flex gap-4 p-4 md:p-5 bg-card border border-card-border rounded-xl shadow-sm transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
      <button
        onClick={handleVote}
        disabled={voteMutation.isPending}
        className={cn(
          "flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-lg border transition-colors hover-elevate",
          request.hasVoted 
            ? "bg-primary border-primary text-primary-foreground" 
            : "bg-muted border-muted-border text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
        )}
      >
        <ChevronUp className={cn("w-6 h-6", request.hasVoted ? "stroke-[3px]" : "stroke-2")} />
        <span className="text-sm font-bold leading-none">{request.voteCount}</span>
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 mb-1">
          <h3 className="font-semibold text-base text-card-foreground leading-tight truncate">
            {request.title}
          </h3>
          <Badge variant="secondary" className={cn("capitalize rounded-md border-none shadow-none font-medium", statusColors[request.status])}>
            {request.status}
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground mt-2 mb-3 line-clamp-2 md:line-clamp-none">
          {request.description}
        </p>

        <div className="flex items-center text-xs text-muted-foreground/80 font-medium">
          <span>{request.submittedBy || "Anonymous"}</span>
          <span className="mx-2 opacity-50">&bull;</span>
          <span>{formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}</span>
        </div>
      </div>
    </div>
  );
}

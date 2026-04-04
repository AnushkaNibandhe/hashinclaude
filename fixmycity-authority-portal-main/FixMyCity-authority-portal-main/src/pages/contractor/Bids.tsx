import { FileText, Loader2, RefreshCw, Clock, DollarSign, StickyNote } from "lucide-react";
import { Link } from "react-router-dom";
import { useContractorBids } from "@/hooks/contractor/useContractorBids";

const STATUS_STYLES: Record<string, string> = {
  PENDING:  "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20",
  ACCEPTED: "bg-green-500/15  text-green-400  border border-green-500/20",
  REJECTED: "bg-red-500/15    text-red-400    border border-red-500/20",
};

export default function ContractorBids() {
  const { bids, loading, error, refetch } = useContractorBids();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading your bids...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="text-center py-16 text-red-400">
          <p>{error}</p>
          <button
            onClick={refetch}
            className="mt-4 flex items-center gap-2 mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />

      {bids.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>
            No bids yet.{" "}
            <Link to="/contractor/app/jobs" className="text-amber-500 hover:underline">
              Browse open jobs
            </Link>{" "}
            to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {bids.map((bid, i) => (
            <div
              key={bid._id}
              className="glass-card p-5 space-y-3 opacity-0 animate-fade-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Top row: job title + status badge */}
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-foreground leading-snug">{bid.jobTitle}</h3>
                <span
                  className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full ${STATUS_STYLES[bid.status] ?? "bg-muted text-muted-foreground"}`}
                >
                  {bid.status}
                </span>
              </div>

              {/* Details row */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  ETA: <span className="text-foreground font-medium">{bid.eta || "—"}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-primary" />
                  Cost: <span className="text-foreground font-medium">₹{bid.cost.toLocaleString()}</span>
                </span>
                {bid.note && (
                  <span className="flex items-center gap-1.5">
                    <StickyNote className="w-3.5 h-3.5 text-primary" />
                    <span className="text-foreground">{bid.note}</span>
                  </span>
                )}
              </div>

              {/* Submitted date */}
              <p className="text-xs text-muted-foreground">
                Submitted {new Date(bid.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Bids</h1>
      <p className="text-muted-foreground mt-1">Track all your submitted bids in one place.</p>
    </div>
  );
}

import { cn } from "@/lib/utils";

interface UserAvatarProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  size?: "sm" | "md" | "lg" | "xl" | "tv";
  className?: string;
}

export function UserAvatar({ avatarUrl, displayName, size = "md", className }: UserAvatarProps) {
  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-16 h-16 text-xl",
    xl: "w-24 h-24 text-2xl",
    tv: "w-32 h-32 text-4xl",
  };

  const initials = displayName ? getInitials(displayName) : "?";

  return (
    <div 
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full overflow-hidden bg-muted border border-border shadow-sm",
        sizeClasses[size],
        className
      )}
    >
      {avatarUrl ? (
        <img
          key={avatarUrl}
          src={avatarUrl}
          alt={displayName || "Avatar"}
          className="h-full w-full object-cover"
          onError={(e) => {
            console.error("UserAvatar: Image failed to load:", avatarUrl);
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <span className="font-bold text-muted-foreground select-none">
          {initials}
        </span>
      )}
    </div>
  );
}

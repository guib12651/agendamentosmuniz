import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataDisplayProps {
  text: string;
  sender: "user" | "mia";
  onSpeak?: (text: string) => void;
  onStop?: () => void;
  isSpeaking?: boolean;
}

export const DataDisplay: React.FC<DataDisplayProps> = ({ 
  text, 
  sender, 
  onSpeak, 
  onStop, 
  isSpeaking 
}) => {
  return (
    <div
      className={cn(
        "flex flex-col max-w-[90%] animate-in fade-in slide-in-from-bottom-2 duration-300",
        sender === "user" ? "ml-auto items-end" : "items-start"
      )}
    >
      <Card
        className={cn(
          "shadow-sm whitespace-pre-wrap overflow-hidden",
          sender === "user"
            ? "bg-primary text-primary-foreground rounded-tr-none border-primary"
            : "bg-card border-border text-foreground rounded-tl-none"
        )}
      >
        <CardContent className="p-3 text-sm">
          {text}
        </CardContent>
      </Card>
      
      {sender === "mia" && (onSpeak || onStop) && (
        <div className="flex items-center gap-2 mt-1">
          {onSpeak && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] text-muted-foreground hover:text-primary"
              onClick={() => onSpeak(text)}
            >
              <Play className="w-3 h-3 mr-1" /> Ouvir
            </Button>
          )}
          {isSpeaking && onStop && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] text-destructive"
              onClick={onStop}
            >
              <Square className="w-3 h-3 mr-1" /> Parar
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

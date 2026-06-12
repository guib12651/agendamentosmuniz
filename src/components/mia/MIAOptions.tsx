import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface MIAOptionsProps {
  options: string[];
  onOptionClick: (option: string) => void;
  disabled?: boolean;
}

export const MIAOptions: React.FC<MIAOptionsProps> = ({ options, onOptionClick, disabled }) => {
  return (
    <div className="grid grid-cols-1 gap-2 mt-4">
      {options.map((btn) => (
        <Button
          key={btn}
          variant="outline"
          className="justify-start text-left h-auto py-2.5 px-3 text-xs bg-background/50 border-primary/10 hover:border-primary/30 hover:bg-primary/5 transition-all"
          onClick={() => onOptionClick(btn)}
          disabled={disabled}
        >
          <ChevronRight className="w-3 h-3 mr-2 text-primary" />
          {btn}
        </Button>
      ))}
    </div>
  );
};

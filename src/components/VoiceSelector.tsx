import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const VoiceSelector = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      // Filter for relevant voices or just show all
      setVoices(availableVoices);
      
      const storedVoice = localStorage.getItem('mia_selected_voice_uri');
      if (storedVoice) {
        setSelectedVoice(storedVoice);
      } else {
        // Try to find a default female Portuguese voice if nothing is stored
        const defaultFemale = availableVoices.find(v => 
          v.lang.includes('pt-BR') && 
          (v.name.toLowerCase().includes('female') || 
           v.name.toLowerCase().includes('feminina') || 
           v.name.toLowerCase().includes('google português do brasil'))
        );
        if (defaultFemale) {
          setSelectedVoice(defaultFemale.voiceURI);
        }
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const handleVoiceChange = (voiceURI: string) => {
    setSelectedVoice(voiceURI);
    localStorage.setItem('mia_selected_voice_uri', voiceURI);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="voice-select" className="text-sm font-medium">Selecione a Voz da MIA</Label>
      <Select value={selectedVoice} onValueChange={handleVoiceChange}>
        <SelectTrigger id="voice-select" className="w-full bg-background">
          <SelectValue placeholder="Selecione uma voz..." />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {voices.length > 0 ? (
            voices.map((voice) => (
              <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </SelectItem>
            ))
          ) : (
            <SelectItem value="none" disabled>Nenhuma voz disponível</SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default VoiceSelector;

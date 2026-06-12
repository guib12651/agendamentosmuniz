import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import VoiceSelector from "@/components/VoiceSelector";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Volume2 } from "lucide-react";

const Settings = () => {
  const navigate = useNavigate();

  const handleSave = () => {
    toast.success("Configurações de voz salvas com sucesso!");
  };

  const handleTestVoice = () => {
    if (!('speechSynthesis' in window)) {
      toast.error("Seu navegador não suporta síntese de voz.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Olá! Esta é uma demonstração da voz selecionada para a MIA.");
    utterance.lang = "pt-BR";
    
    const selectedURI = localStorage.getItem('mia_selected_voice_uri');
    if (selectedURI) {
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.voiceURI === selectedURI);
      if (voice) utterance.voice = voice;
    }
    
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold font-display">Configurações</h1>
        </div>

        <Card className="border-border/40 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-primary" />
              Personalização da MIA
            </CardTitle>
            <CardDescription>
              Escolha a voz que a Muniz Inteligência Assistente usará para falar com você.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <VoiceSelector />
            
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/40">
              <Button onClick={handleSave} className="flex-1">
                Salvar Configurações
              </Button>
              <Button variant="outline" onClick={handleTestVoice} className="flex-1">
                Testar Voz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;

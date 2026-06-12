import React, { useState, useEffect, useRef } from "react";
import { 
  Bot, 
  X, 
  Send, 
  Volume2, 
  VolumeX, 
  Loader2,
  Brain,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { fetchData } from "@/services/api";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Settings as SettingsIcon } from "lucide-react";
import { MIAOptions } from "./mia/MIAOptions";
import { DataDisplay } from "./mia/DataDisplay";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


interface Message {
  id: string;
  text: string;
  sender: "user" | "mia";
  timestamp: Date;
}

const QUICK_BUTTONS = [
  "Resumo de hoje",
  "Resumo da semana",
  "Vendas do mês",
  "Ranking de vendas",
  "Faltas de hoje",
  "Oportunidades pendentes",
  "Negociações abertas",
  "Meta do mês",
  "Gargalos da operação",
  "Melhor usuário da semana",
  "Clientes para recuperar",
  "Cotas e lances",
  "Linha do tempo do dia"
];

export const MIA: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(() => {
    return localStorage.getItem("mia_voice_enabled") === "true";
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    localStorage.setItem("mia_voice_enabled", String(isVoiceEnabled));
  }, [isVoiceEnabled]);

  if (!isAdmin) return null;

  const [error, setError] = useState<string | null>(null);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);
    setError(null);
    
    // Cancel ongoing speech if any
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    try {
      const result = await fetchData(text, profile?.id || "", profile?.displayName || "Admin");
      
      const miaMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: result.text,
        sender: "mia",
        timestamp: result.timestamp
      };

      setMessages(prev => [...prev, miaMessage]);
      if (isVoiceEnabled) {
        speakText(result.text);
      }
    } catch (err) {
      setError("Houve um erro ao processar sua solicitação. Por favor, tente novamente.");
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    
    // Clean text for speech
    let cleanText = text
      .replace(/[#*`]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/(\d+)\/(\d+)/g, '$1 de $2');

    // Limit long text for voice
    if (cleanText.length > 700) {
      const summaryMatch = cleanText.match(/^[^.!?]+[.!?]/);
      cleanText = summaryMatch ? summaryMatch[0] + " Veja a lista completa na tela." : cleanText.slice(0, 650) + "... Veja mais na tela.";
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "pt-BR";
    utterance.rate = 1.1;
    
    // Check for user-selected voice
    const storedVoiceURI = localStorage.getItem('mia_selected_voice_uri');
    const voices = window.speechSynthesis.getVoices();
    
    if (storedVoiceURI) {
      const selectedVoice = voices.find(v => v.voiceURI === storedVoiceURI);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    } else {
      // Fallback to default female logic if no specific voice selected
      const femaleVoice = voices.find(v => 
        v.lang.includes('pt-BR') && 
        (v.name.toLowerCase().includes('female') || 
         v.name.toLowerCase().includes('feminina') || 
         v.name.toLowerCase().includes('maria') || 
         v.name.toLowerCase().includes('luciana') || 
         v.name.toLowerCase().includes('google português do brasil'))
      );
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }
    }
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  return (
    <>
      {/* Floating Button */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-2xl bg-gradient-to-tr from-primary to-primary/80 hover:to-primary text-white border-0"
        >
          <Bot className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-sky-500"></span>
          </span>
        </Button>
      </motion.div>

      {/* Side Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-[400px] bg-background shadow-2xl z-[70] flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between bg-card/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg leading-none">MIA</h2>
                    <p className="text-xs text-muted-foreground mt-1">Muniz Inteligência Assistente</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsOpen(false);
                      navigate("/settings");
                    }}
                    className="h-8 w-8 p-0 rounded-full text-muted-foreground"
                    title="Configurações de voz"
                  >
                    <SettingsIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                    className={cn(
                      "h-8 w-8 p-0 rounded-full",
                      isVoiceEnabled ? "text-primary bg-primary/10" : "text-muted-foreground"
                    )}
                    title={isVoiceEnabled ? "Voz ativada" : "Voz desativada"}
                  >
                    {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </Button>

                  <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-8 w-8 p-0 rounded-full">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Chat Area */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                {messages.length === 0 && (
                  <div className="space-y-6 py-6">
                    <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                      <p className="text-sm font-medium mb-3">Como posso ajudar você hoje, {profile?.displayName.split(" ")[0]}?</p>
                      <p className="text-xs text-muted-foreground mb-4">Pergunte qualquer coisa sobre a operação da Muniz.</p>
                      <div className="grid grid-cols-1 gap-2">
                        {QUICK_BUTTONS.map((btn) => (
                          <Button
                            key={btn}
                            variant="outline"
                            className="justify-start text-left h-auto py-2.5 px-3 text-xs bg-background/50 border-primary/10 hover:border-primary/30 hover:bg-primary/5 transition-all"
                            onClick={() => handleSend(btn)}
                          >
                            <ChevronRight className="w-3 h-3 mr-2 text-primary" />
                            {btn}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                      msg.sender === "user" ? "ml-auto items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap",
                        msg.sender === "user"

                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-card border border-border text-foreground rounded-tl-none"
                      )}
                    >
                      {msg.text}
                    </div>
                    {msg.sender === "mia" && (
                      <div className="flex items-center gap-2 mt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[10px] text-muted-foreground hover:text-primary"
                          onClick={() => speakText(msg.text)}
                        >
                          <Play className="w-3 h-3 mr-1" /> Ouvir
                        </Button>
                        {isSpeaking && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[10px] text-destructive"
                            onClick={stopSpeaking}
                          >
                            <Square className="w-3 h-3 mr-1" /> Parar
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex items-start max-w-[85%]">
                    <div className="bg-card border border-border p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">MIA está analisando a operação...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-border bg-card">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend(input);
                  }}
                  className="relative flex items-center"
                >
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Pergunte aqui..."
                    className="pr-12 h-11 rounded-full border-border bg-slate-50 text-slate-900 focus-visible:ring-primary placeholder:text-slate-400"
                  />
                  <Button
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    size="sm"
                    className="absolute right-1 w-9 h-9 rounded-full p-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
                <div className="mt-2 flex justify-between items-center">
                  <p className="text-[10px] text-muted-foreground px-2">
                    MIA - Muniz Inteligência Assistente
                  </p>
                  <div className="flex gap-2">
                    {messages.length > 0 && (
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="h-auto p-0 text-[10px] text-muted-foreground"
                        onClick={() => setMessages([])}
                      >
                        Limpar conversa
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

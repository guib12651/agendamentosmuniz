import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Profile {
  id: string;
  display_name: string;
}

interface ImportOpportunitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportOpportunitiesModal({ isOpen, onClose, onSuccess }: ImportOpportunitiesModalProps) {
  const { profile } = useAuth();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [users, setUsers] = useState<Profile[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(1); // 1: Setup, 2: Uploading, 3: Success

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      resetState();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("role", ["pre_seller", "admin"])
      .order("display_name");
    
    if (data) setUsers(data);
  };

  const resetState = () => {
    setSelectedUser("");
    setFiles([]);
    setIsProcessing(false);
    setProgress(0);
    setCurrentStep(1);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (files.length + newFiles.length > 50) {
        toast.error("Máximo de 50 imagens permitidas.");
        return;
      }
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImport = async () => {
    if (!selectedUser) {
      toast.error("Selecione um pré-vendedor.");
      return;
    }
    if (files.length === 0) {
      toast.error("Selecione pelo menos uma imagem.");
      return;
    }

    setIsProcessing(true);
    setCurrentStep(2);
    setProgress(0);

    try {
      const batchId = crypto.randomUUID();
      const imagesBase64 = await Promise.all(files.map(f => convertToBase64(f)));
      
      // Process images in batches of 5 to avoid timeouts in edge function
      const batchSize = 5;
      const results = [];
      
      for (let i = 0; i < imagesBase64.length; i += batchSize) {
        const chunk = imagesBase64.slice(i, i + batchSize);
        const { data, error } = await supabase.functions.invoke('process-opportunity-ocr', {
          body: { images: chunk }
        });

        if (error) throw error;
        if (data.results) {
          results.push(...data.results);
        }
        
        setProgress(Math.round(((i + chunk.length) / imagesBase64.length) * 100));
      }

      // Save opportunities to database
      const opportunitiesToInsert = results.map(res => ({
        created_by: profile?.id,
        assigned_user_id: selectedUser,
        lead_name: res.lead_name || "Desconhecido",
        phone: res.phone || "",
        city: res.city || "",
        opportunity_type: res.opportunity_type || "",
        vehicle_or_property: res.vehicle_or_property || "",
        desired_value: res.desired_value || "",
        desired_installment: res.desired_installment || "",
        available_down_payment: res.available_down_payment || "",
        notes: res.notes || "",
        status: "pending",
        import_batch_id: batchId,
        ocr_raw_text: JSON.stringify(res)
      }));

      const { error: insertError } = await supabase
        .from('opportunities')
        .insert(opportunitiesToInsert);

      if (insertError) throw insertError;

      toast.success(`${opportunitiesToInsert.length} oportunidades importadas com sucesso!`);
      setCurrentStep(3);
      onSuccess();
    } catch (error: any) {
      console.error("Erro na importação:", error);
      toast.error("Falha ao processar imagens. Verifique a conexão e tente novamente.");
      setIsProcessing(false);
      setCurrentStep(1);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] overflow-y-auto flex flex-col p-0">
        <div className="p-6 overflow-y-auto flex-1">
        <DialogHeader>
          <DialogTitle>📤 Importar Oportunidades</DialogTitle>
          <DialogDescription>
            Faça upload dos prints do Meta Ads. O sistema fará a leitura automática (OCR).
          </DialogDescription>
        </DialogHeader>

        {currentStep === 1 && (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="user">Responsável (Pré-vendedor)</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Imagens (Máximo 50)</Label>
              <div 
                className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors cursor-pointer relative"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm font-medium">Clique para selecionar ou arraste aqui</span>
                <span className="text-xs text-muted-foreground">PNG, JPG, JPEG, WEBP</span>
                <input 
                  id="file-upload" 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </div>

              {files.length > 0 && (
                <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto">
                  <div className="flex justify-between items-center text-xs font-medium text-muted-foreground mb-1">
                    <span>{files.length} imagens selecionadas</span>
                    <button onClick={() => setFiles([])} className="text-destructive hover:underline">Remover todas</button>
                  </div>
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between bg-muted/30 p-2 rounded border border-border">
                      <span className="text-xs truncate max-w-[300px]">{file.name}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeFile(i)} className="h-6 w-6 p-0">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <div className="text-center">
              <h3 className="font-semibold">Processando OCR...</h3>
              <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos dependendo da quantidade de imagens.</p>
            </div>
            <div className="w-full max-w-xs space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-[10px] text-center text-muted-foreground">{progress}% completo</p>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <div className="text-center">
              <h3 className="font-semibold">Importação concluída!</h3>
              <p className="text-sm text-muted-foreground">Todas as oportunidades foram criadas e atribuídas.</p>
            </div>
          </div>
        )}

        </div>
        <DialogFooter className="p-6 pt-2 border-t mt-auto flex-row gap-2 justify-end">
          {currentStep === 1 && (
            <>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleImport} disabled={!selectedUser || files.length === 0}>
                Iniciar Importação
              </Button>
            </>
          )}
          {currentStep === 3 && (
            <Button onClick={onClose}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

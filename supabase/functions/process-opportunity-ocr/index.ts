import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { images } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma imagem fornecida" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Process images in batches if necessary, but for now let's assume we can send multiple to GPT
    // However, GPT-4o has a limit. 50 images might be too much for one call.
    // Let's process them in smaller batches or individually to be safe and more accurate.
    
    const results = [];
    
    // Process in batches of 5 to avoid timeouts and token limits
    const batchSize = 5;
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);
      
      const prompt = `Você é um especialista em extração de dados de formulários do Meta Ads (leads). 
Extraia as seguintes informações das imagens fornecidas:
- lead_name (Nome completo)
- phone (Telefone com DDD)
- city (Cidade)
- opportunity_type (Imóvel ou Veículo)
- vehicle_or_property (Qual o imóvel ou veículo de interesse)
- desired_value (Valor total desejado)
- available_down_payment (Entrada disponível)
- desired_installment (Faixa de parcela desejada)
- notes (Qualquer observação extra ou data de recebimento)

Retorne APENAS um array JSON contendo um objeto para cada imagem, na mesma ordem. Se um campo não for encontrado, deixe-o como string vazia.
Exemplo de formato:
[
  {
    "lead_name": "João Silva",
    "phone": "11999999999",
    "city": "São Paulo",
    "opportunity_type": "Imóvel",
    "vehicle_or_property": "Apartamento 2 quartos",
    "desired_value": "300.000",
    "available_down_payment": "50.000",
    "desired_installment": "1.500",
    "notes": "Recebido em 10/10/2023"
  }
]`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                ...batch.map((img: string) => ({
                  type: "image_url",
                  image_url: { url: img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}` }
                }))
              ],
            },
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erro na API Lovable: ${response.status} ${errorText}`);
        throw new Error(`Falha ao processar OCR via AI Gateway`);
      }

      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);
      
      // The model might return { "opportunities": [...] } or just the array directly if instructed
      // Since I used response_format: json_object, I should be careful.
      // Usually it returns what I asked for.
      if (Array.isArray(content)) {
        results.push(...content);
      } else if (content.opportunities && Array.isArray(content.opportunities)) {
        results.push(...content.opportunities);
      } else if (typeof content === 'object') {
        // If it returns a single object for some reason (maybe one image or wrapped)
        const possibleArray = Object.values(content).find(val => Array.isArray(val));
        if (possibleArray) {
          results.push(...(possibleArray as any[]));
        } else {
          results.push(content);
        }
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro no processamento:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

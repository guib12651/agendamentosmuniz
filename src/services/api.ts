import { getMiaResponse } from "@/lib/miaService";

/**
 * Service to bridge MIA interface with real operational data.
 */
export const fetchData = async (option: string, userId: string, userName: string) => {
  try {
    const response = await getMiaResponse(option, userId, userName);
    return {
      text: response,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Error in MIA API service:", error);
    throw new Error("Erro ao carregar dados da operação. Tente novamente.");
  }
};

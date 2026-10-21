// Chamada única de IA para o Assistente iTERA (site) e o Copiloto IA do CRM.
// Ordem: Groq (GROQ_API_KEY, mesmo provedor do CRM da Barack Prime) e, se configurado,
// Vercel AI Gateway (AI_GATEWAY_API_KEY). Sem chave ou com falha, retorna null e
// cada rota usa a sua base de respostas por regras.

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

type Completion = { choices?: Array<{ message?: { content?: string } }> };

export async function callChatModel(
  messages: ChatMessage[],
  options: { json?: boolean; maxTokens?: number; temperature?: number } = {},
): Promise<{ raw: string; model: string } | null> {
  const { json = true, maxTokens = 900, temperature = 0.6 } = options;

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    for (const model of GROQ_MODELS) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            ...(json ? { response_format: { type: "json_object" } } : {}),
          }),
          signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) {
          console.error("AI Groq failed", { model, status: response.status });
          continue;
        }
        const raw = ((await response.json()) as Completion).choices?.[0]?.message?.content || "";
        if (raw) return { raw, model: `groq/${model}` };
      } catch (error) {
        console.error("AI Groq error", { model, message: error instanceof Error ? error.message : "unknown" });
      }
    }
  }

  const gatewayToken = process.env.AI_GATEWAY_API_KEY;
  if (gatewayToken) {
    const model = process.env.AI_GATEWAY_MODEL || "openai/gpt-4o-mini";
    try {
      const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${gatewayToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, stream: false, max_tokens: maxTokens }),
        signal: AbortSignal.timeout(20_000),
      });
      if (response.ok) {
        const raw = ((await response.json()) as Completion).choices?.[0]?.message?.content || "";
        if (raw) return { raw, model };
      } else {
        console.error("AI gateway failed", { status: response.status });
      }
    } catch (error) {
      console.error("AI gateway error", { message: error instanceof Error ? error.message : "unknown" });
    }
  }
  return null;
}

// Tabela PRIFE Brasil enviada pelo distribuidor (sujeita a atualização).
export const PRICE_TABLE = [
  { name: "iTeraCare Classic", distributorUsd: 450, distributorBrl: 2475, price: 3500 },
  { name: "iTeraCare Classic Plus", distributorUsd: 550, distributorBrl: 3025, price: 4500 },
  { name: "Bio-lite (iTera-Bio Lite)", distributorUsd: 1500, distributorBrl: 8250, price: 12500 },
  { name: "Pulseira", distributorUsd: 150, distributorBrl: 825, price: 899 },
  { name: "Óculos Envy", distributorUsd: 95, distributorBrl: 522.5, price: 749 },
  { name: "Óculos de Sol Aurora", distributorUsd: 130, distributorBrl: 715, price: 899 },
  { name: "Ion Shield", distributorUsd: 400, distributorBrl: 2200, price: 2900 },
  { name: "MagnoSeek", distributorUsd: 5800, distributorBrl: 31900, price: 41500 },
  { name: "Renew Patch (caixa)", distributorUsd: 65, distributorBrl: 357.5, price: 460 },
  { name: "Renew Patch (unidade)", distributorUsd: null, distributorBrl: null, price: 22 },
] as const;

const brl = (value: number) => "R$ " + value.toLocaleString("pt-BR", { minimumFractionDigits: value % 1 ? 2 : 0, maximumFractionDigits: 2 });

/** Preços ao cliente final (para o site). */
export const customerPriceList = () => PRICE_TABLE.map((item) => `${item.name}: ${brl(item.price)}`).join("\n");

/** Preço ao cliente + custo do distribuidor + lucro (só para o CRM, área do distribuidor). */
export const distributorPriceList = () =>
  PRICE_TABLE.map((item) =>
    item.distributorBrl === null
      ? `${item.name}: venda ${brl(item.price)}`
      : `${item.name}: venda ${brl(item.price)} | custo distribuidor US$ ${item.distributorUsd} (${brl(item.distributorBrl)}) | lucro ${brl(item.price - item.distributorBrl)}`,
  ).join("\n");

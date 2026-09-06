// Responses REST payload fields used by the server routes.
export type OpenAIResponse = {
  status?: string;
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
  usage?: { input_tokens?: number; total_tokens?: number };
};

export function extractResponseText(payload: OpenAIResponse): string {
  if (payload.status !== "completed") return "";
  return (payload.output ?? [])
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text")
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
}

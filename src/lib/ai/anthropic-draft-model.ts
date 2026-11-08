import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { DraftError, modelDraftSchema, type DraftModel } from "./parse-job";

// The cheapest current model: reading one short message into seven fields needs no more.
const MODEL = "claude-haiku-5-5";

export function createAnthropicDraftModel(apiKey: string): DraftModel {
  // One retry and a short timeout: this is a convenience, and the seller can always type the
  // job in by hand.
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 20_000 });
  return {
    async generate({ system, message }) {
      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: 1500,
        system,
        messages: [{ role: "user", content: message }],
        output_config: { effort: "low", format: zodOutputFormat(modelDraftSchema) },
      });
      if (response.stop_reason === "refusal") {
        throw new DraftError("The message could not be read.", "unusable");
      }
      return response.parsed_output;
    },
  };
}

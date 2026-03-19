export async function llmIntentClassifier(studentText, stepsConfig) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return null;
  }

  const steps = Array.isArray(stepsConfig?.steps) ? stepsConfig.steps : [];

  const systemPrompt = `
You are a strict classifier for algebra student input.

Return ONLY valid JSON with this exact shape:
{
  "intent": "help_question" | "step_attempt" | "unknown",
  "stepType": "string or null",
  "valueRaw": "string or null",
  "confidence": number
}

Definitions:
- "help_question" means the student is asking whether a proposed algebra step is correct.
- "step_attempt" means the student is directly stating a step, equation, or answer.
- "unknown" means the message is unclear, off-topic, or does not contain a usable math action.

Important:
- Be generous in classifying question-style step proposals as "help_question".
- Even informal phrasing, hedging, or small typos can still be "help_question".
- If the student seems to be asking about a specific possible step, prefer "help_question" over "unknown".

Examples of help_question:
- "do i subtract 5?"
- "should i divide by 3?"
- "am i supposed to subtract 5?"
- "is it divide by 3?"
- "do i subtrct 5?"
- "maybe remove the 5?"
- "should i move x?"
- "do i subtract x?"
- "is x = 5?"
- "do i just write 3x = 15?"

Examples of step_attempt:
- "subtract 5"
- "divide by 3"
- "3x = 15"
- "x = 5"
- "5"

Examples of unknown:
- "okay"
- "wait"
- "huh"
- "i'm confused"

Common mappings:
- "subtract 5", "remove 5", "get rid of the 5", "take away 5" -> stepType "subtract_constant", valueRaw "5"
- "add 3", "plus 3" -> stepType "add_constant", valueRaw "3"
- "divide by 3" -> stepType "divide_by_coefficient", valueRaw "3"
- "multiply by 2" -> stepType "multiply_by_coefficient", valueRaw "2"
- "move x", "subtract x", "move the x term" -> stepType "move_x_term"
- "3x = 15" -> stepType "state_intermediate_equation", valueRaw "3x = 15"
- "x = 5", "is x = 5?", "5" -> stepType "state_final_answer", valueRaw "5"
- vague help like "what should i do?" or "i dont know" -> stepType "ask_for_help"

Rules:
- Choose stepType only from the provided list, or null.
- valueRaw should contain the extracted numeric or symbolic value if present.
- confidence must be between 0 and 1.
- Do not explain anything.
`.trim();

  const userPrompt = `
Student text:
${studentText}

Allowed step types:
${JSON.stringify(steps, null, 2)}
`.trim();

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        temperature: 0,
        response_format: { type: "json_object" },
     messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
        ],
      }),
    });

    //console.log("LLM RAW RESPONSE:", response);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return null;
    }

    const parsed = JSON.parse(content);

    //console.log("LLM PARSED:", parsed);

    const intent = parsed.intent || "unknown";
    const stepType = parsed.stepType ?? null;
    const valueRaw = parsed.valueRaw ?? null;
    const confidence =
    typeof parsed.confidence === "number" ? parsed.confidence : 0;

    if (intent === "help_question" && !stepType) {
    return {
        intent: "unknown",
        stepType: null,
        valueRaw: null,
        confidence,
        rawText: studentText,
    };
    }

    return {
        intent,
        stepType,
        valueRaw,
        confidence,
        rawText: studentText,
    };

  } catch (err) {
    //console.error("llmIntentClassifier error:", err);
    //console.log("FAILED RAW TEXT:", response);
    return null;
  }
}

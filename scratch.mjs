import {
  createProblemState,
  createProblemLog,
  processStudentTurn,
} from "./lib/tutor/index.js";

let state = createProblemState("3x + 5 = 20");
createProblemLog(state);

state.awaitingConfirmation = {
  source: "llm",
  stepType: "subtract_constant",
  valueRaw: "5",
  confidence: 0.7,
  rawText: "maybe remove the 5?",
};

const result = await processStudentTurn({
  problemState: state,
  studentText: "no",
});

console.log(result.reply);

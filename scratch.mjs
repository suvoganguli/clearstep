import {
  createProblemState,
  createProblemLog,
  processStudentTurn,
} from "./lib/tutor/index.js";

let state = createProblemState("3x + 5 = 20");
createProblemLog(state);

let result = await processStudentTurn({
  problemState: state,
  studentText: "subtract 5",
});

console.log(result.mathResult);
console.log(result.problemState.currentEquation);

state = result.problemState;

result = await processStudentTurn({
  problemState: state,
  studentText: "divide by 3",
});

console.log(result.mathResult);
console.log(result.problemState.currentEquation);

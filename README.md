# ClearStep

ClearStep is an experimental AI algebra tutor that helps students solve equations step by step.  
Instead of giving the full solution immediately, ClearStep evaluates each student step and provides guidance toward the next move.

The system combines a **deterministic algebra engine** with **LLM-based tutoring responses**.

---

## Current Capabilities

Phase 1 supports solving linear equations of the form:

ax + b = c

where `a`, `b`, and `c` are integers.

Example:

3x + 5 = 20

Students enter **one step at a time**, such as:

subtract 5  
3x = 15  
x = 5  

The system checks each step and responds with feedback.

---

## Architecture

ClearStep uses a hybrid approach.

### Deterministic Algebra Engine

Responsible for:

- equation normalization
- equation parsing
- validating algebra steps
- determining the correct solution

This ensures mathematical correctness.

### LLM Tutor Layer

Responsible for:

- conversational guidance
- hints and encouragement
- explanations when students ask for help

The LLM operates within guardrails provided by the deterministic engine.

---

## Project Structure
app/
api/
tutor/
route.js

lib/
algebra/
common/
textNormalize.js
linear/
solver.js
stepChecker.js

tests/
linear_v1_tests.mjs


---

## Running the Project

Install dependencies:

npm install

Run the development server:

npm run dev

The app will start locally using Next.js.

---

## Running Tests

From the project root:

node tests/linear_v1_tests.mjs

These tests validate the deterministic linear equation engine.

---

## Example Interaction

Problem:

5 + 3x = 20

Student steps:

subtract 5  
3x = 15  
x = 5  

ClearStep checks each step and guides the student to the final answer.

---

## Current Limitations

Phase 1 currently supports equations of the form:

ax + b = c

Future versions will expand to include:

- multi-step equations
- inequalities
- fractions
- systems of equations

---

## Status

Prototype — active development.

Latest stable tag:

v0.1.0

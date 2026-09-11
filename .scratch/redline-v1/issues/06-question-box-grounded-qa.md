# 06: Question box (grounded Q&A)

**What to build:** a user can ask a question about their uploaded document and get an answer grounded only in that document's text — never outside knowledge, never inference beyond what the text supports.

**Blocked by:** 02 (Upload, client-side extraction, and private document storage)

**Status:** ready-for-agent

- [ ] `answerQuestion(text, question) → Answer` seam implemented, routed through OpenRouter, with no access to the red-line list or the analysis output.
- [ ] A user can type a question about their document in a question box and receive an answer.
- [ ] Test: for questions whose answers are supported by the document text, the answer draws only on that text.
- [ ] Test: for questions whose answers are not supported by the document text, the response is an honest non-answer — never a fabricated claim standing in for "I don't know."

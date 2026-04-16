import app from "./app.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
  console.log(`   Test: http://localhost:${PORT}/test`);
  console.log(`   API: http://localhost:${PORT}/api/healthz`);
});
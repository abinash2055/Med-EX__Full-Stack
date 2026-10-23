import app from "./app";

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => {
  console.log(`MedEx backend running at http://localhost:${PORT}`);
});
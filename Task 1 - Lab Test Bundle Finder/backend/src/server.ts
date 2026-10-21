import app from "./app";

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
    console.log(`MedEx API running at http://localhost:${PORT}`);
});
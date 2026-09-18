import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app.js";

const { MONGODB_URI, PORT = 4000 } = process.env;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Copy .env.example to .env first.");
  process.exit(1);
}

// Connect before listening: a server that accepts requests it cannot serve is
// worse than one that is briefly unavailable.
try {
  await mongoose.connect(MONGODB_URI);
  console.log("MongoDB connected");
} catch (error) {
  console.error("MongoDB connection failed:", error.message);
  process.exit(1);
}

createApp().listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
}

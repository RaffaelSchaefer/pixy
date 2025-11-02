import cors from "cors";
import "dotenv/config";
import express from "express";

const PORT = process.env.WEBSERVER_PORT || 3000;

const app = express();

app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

import express from "express";

import { MissionRepository } from "./repositories/MissionRepository.js";
import { MissionService } from "./services/MissionService.js";

const app = express();

const PORT = 3000;

const repository = new MissionRepository();

const missionService = new MissionService(repository);

app.get("/missions/:id", async (req, res) => {
  const mission = await missionService.getMission(req.params.id);

  res.json(mission);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

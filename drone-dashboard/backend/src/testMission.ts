import { MissionReplayEngine } from "./replay/MissionReplayEngine.js";
import { MissionRepository } from "./repositories/MissionRepository.js";

const repository = new MissionRepository();

const mission = await repository.findById("mission-001");

const engine = new MissionReplayEngine(mission);

console.log(mission.id);
console.log(mission.name);
console.log(mission.frames.length);

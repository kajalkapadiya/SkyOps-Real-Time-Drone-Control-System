import { MissionRepository } from "../repositories/MissionRepository.js";

export class MissionService {
  private repository: MissionRepository;

  constructor(repository: MissionRepository) {
    this.repository = repository;
  }

  async getMission(id: string) {
    if (!id) {
      throw new Error("Mission ID is required");
    }

    return this.repository.findById(id);
  }

  async getMissionSummary(id: string) {
    const mission = await this.getMission(id);

    return {
      id: mission.id,
      name: mission.name,
      durationSeconds: mission.durationSeconds,
      droneCount: mission.droneIds.length,
      frameCount: mission.frames.length,
    };
  }
}

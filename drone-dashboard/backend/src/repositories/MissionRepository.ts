import fs from "node:fs/promises";
import path from "node:path";

import { Mission } from "../models/Mission.js";

export class MissionRepository {
  async findById(id: string): Promise<Mission> {
    const filePath = path.join(process.cwd(), "data", `${id}.json`);

    const file = await fs.readFile(filePath, "utf-8");

    return JSON.parse(file) as Mission;
  }
}

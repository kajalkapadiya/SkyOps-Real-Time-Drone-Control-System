export interface Fleet {
  id: string;
  name: string;
  type:
    | "Search & Rescue"
    | "Border Patrol"
    | "Infrastructure Inspection"
    | "Medical Delivery";
  baseLocation: string;
  description: string;
}

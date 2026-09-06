import CinematicGate from "@/components/cinematic/CinematicGate";
import { unlockCinematic } from "./actions";

export default function CinematicPage() {
  return <CinematicGate unlock={unlockCinematic} />;
}

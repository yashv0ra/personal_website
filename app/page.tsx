import CinematicHome from "@/components/cinematic/CinematicHome";
import { resume } from "@/lib/resume";

export default function Home() {
  return <CinematicHome email={resume.basics.email} links={resume.basics.links} />;
}

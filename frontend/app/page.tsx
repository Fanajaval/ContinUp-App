import { redirect } from "next/navigation";

/** Point d'entrée de l'app : toujours l'authentification. */
export default function Home() {
  redirect("/login");
}

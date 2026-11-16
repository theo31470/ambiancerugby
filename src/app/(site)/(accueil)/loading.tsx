import { SqueletteAccueil } from "@/components/app/Squelettes";
import LoadingPinte from "../loading";

/** Accueil : sur téléphone la forme de l'accueil façon app, sur ordinateur la pinte qui se remplit. */
export default function Loading() {
  return (
    <>
      <div className="lg:hidden"><SqueletteAccueil /></div>
      <div className="hidden lg:block"><LoadingPinte /></div>
    </>
  );
}

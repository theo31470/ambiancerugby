import { notFound } from "next/navigation";

/** Toute adresse inconnue : la page « Ballon en touche », dans l'habillage du site. */
export default function Inconnu() {
  notFound();
}

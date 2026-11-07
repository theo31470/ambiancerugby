import type { Metadata } from "next";
import ProfileForm from "@/components/ProfileForm";
import { getViewer, publicClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mon profil" };

export default async function ProfilPage() {
  const viewer = (await getViewer())!;
  const { data: teams } = await publicClient().from("teams").select("id,name").order("name");
  return (
    <div className="max-w-md">
      <h2 className="groovy text-3xl text-vin mb-6">Mon profil</h2>
      <div className="bg-surface border border-trait rounded-[1.5rem] p-6">
        <ProfileForm viewer={viewer} teams={(teams ?? []) as { id: string; name: string }[]} />
      </div>
    </div>
  );
}

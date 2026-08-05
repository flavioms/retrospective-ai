import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { createRoom } from "@/lib/db/rooms";

async function createRoomAction() {
  "use server";
  const room = await createRoom();
  redirect(`/room/${room.id}`);
}

export default async function Home() {
  const t = await getTranslations("landing");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="fixed top-4 right-4 flex gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
      <main className="flex w-full max-w-lg flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-muted-foreground text-balance">{t("description")}</p>
        </div>
        <form action={createRoomAction}>
          <Button type="submit" size="lg">
            {t("createRoom")}
          </Button>
        </form>
      </main>
    </div>
  );
}

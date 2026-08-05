import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { joinRoomAction } from "@/app/room/[roomId]/actions";

export async function JoinRoomForm({ roomId }: { roomId: string }) {
  const t = await getTranslations("join");

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="fixed top-4 right-4 flex gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
      <form
        action={joinRoomAction.bind(null, roomId)}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5 text-center">
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("description")}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="displayName">{t("displayNameLabel")}</Label>
          <Input
            id="displayName"
            name="displayName"
            required
            maxLength={60}
            autoFocus
            placeholder={t("displayNamePlaceholder")}
          />
        </div>
        <Button type="submit">{t("submit")}</Button>
      </form>
    </div>
  );
}

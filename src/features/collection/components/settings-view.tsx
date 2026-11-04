"use client";

import { Download, FileUp, Monitor, Moon, Sun } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useThemePreference } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { GAMES } from "@/features/games/config";
import { cn } from "@/lib/utils";
import { useCollectionStore } from "@/stores/collection-store";
import { usePreferencesStore, type ThemePreference } from "@/stores/preferences-store";

import { backupFileName, createBackup, parseBackup, type ParsedBackup } from "../backup";

const THEMES: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

function Card({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-(--shadow-card) sm:p-6"
    >
      <h2 id={id} className="text-xl font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function SettingsView() {
  const { theme, setTheme } = useThemePreference();
  const snapshot = useCollectionStore((s) => s.snapshot);
  const importCollections = useCollectionStore((s) => s.importCollections);
  const lastGame = usePreferencesStore((s) => s.lastGame);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<ParsedBackup | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function exportBackup() {
    await useCollectionStore.getState().hydrate();
    const backup = createBackup({
      collections: snapshot(),
      preferences: { lastGame: lastGame ?? undefined, theme },
    });
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = backupFileName();
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exportado.");
  }

  async function readFile(file: File) {
    setImportError(null);
    setPending(null);
    if (file.size > 2_000_000) {
      setImportError("Arquivo grande demais para ser um backup do SmartDex.");
      return;
    }
    const result = parseBackup(await file.text());
    if (result.ok) setPending(result.backup);
    else setImportError(result.error);
  }

  async function applyImport(mode: "merge" | "replace") {
    if (!pending) return;
    setBusy(true);
    try {
      await importCollections(pending.collections, mode);
      toast.success(
        mode === "merge"
          ? "Backup mesclado ao seu progresso."
          : "Progresso substituído pelo backup.",
      );
      setPending(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setImportError("Não foi possível salvar os dados importados.");
    } finally {
      setBusy(false);
    }
  }

  const pendingGames = pending ? Object.entries(pending.collections) : [];

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Ajustes</h1>
      </header>

      <Card id="tema" title="Aparência">
        <div role="radiogroup" aria-labelledby="tema" className="grid grid-cols-3 gap-2">
          {THEMES.map((option) => {
            const active = theme === option.value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(option.value)}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border-2 text-sm font-semibold transition-colors",
                  active ? "border-foreground bg-accent" : "border-border hover:bg-accent",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {option.label}
              </button>
            );
          })}
        </div>
      </Card>

      <Card id="backup" title="Backup do progresso">
        <p className="text-muted-foreground">
          Seu progresso fica salvo apenas neste navegador. Exporte um arquivo para guardar uma cópia
          ou levar para outro aparelho. Este controle é do SmartDex e não tem relação com a coleção
          do Pokémon HOME.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="h-12 gap-2 rounded-xl px-5" onClick={() => void exportBackup()}>
            <Download className="size-5" aria-hidden="true" />
            Exportar backup (JSON)
          </Button>
          <Button
            variant="outline"
            className="h-12 gap-2 rounded-xl px-5"
            onClick={() => fileRef.current?.click()}
          >
            <FileUp className="size-5" aria-hidden="true" />
            Importar backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void readFile(file);
            }}
          />
        </div>

        <div aria-live="polite">
          {importError && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 font-semibold text-destructive"
            >
              {importError}
            </p>
          )}
          {pending && (
            <div className="flex flex-col gap-4 rounded-2xl border bg-background p-4">
              <div>
                <p className="font-semibold">
                  Backup de {new Date(pending.exportedAt).toLocaleString("pt-BR")}
                </p>
                <ul className="mt-1 text-sm text-muted-foreground">
                  {pendingGames.length === 0 && <li>Nenhum progresso no arquivo.</li>}
                  {pendingGames.map(([game, c]) => (
                    <li key={game}>
                      {GAMES[game as keyof typeof GAMES].name}: {c?.caught.length ?? 0} capturados
                    </li>
                  ))}
                  {pending.ignoredGames.length > 0 && (
                    <li>
                      Ignorados (jogos ainda não suportados): {pending.ignoredGames.join(", ")}
                    </li>
                  )}
                </ul>
              </div>
              <p className="text-sm">
                <strong>Mesclar</strong> soma o backup ao que você já marcou.{" "}
                <strong>Substituir</strong> troca o progresso dos jogos do arquivo pelo conteúdo do
                backup.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="h-11 rounded-xl"
                  disabled={busy}
                  onClick={() => void applyImport("merge")}
                >
                  Mesclar
                </Button>
                <Button
                  variant="outline"
                  className="h-11 rounded-xl"
                  disabled={busy}
                  onClick={() => void applyImport("replace")}
                >
                  Substituir
                </Button>
                <Button
                  variant="ghost"
                  className="h-11 rounded-xl"
                  disabled={busy}
                  onClick={() => {
                    setPending(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card id="sobre" title="Sobre os dados">
        <ul className="flex list-disc flex-col gap-2 pl-5 text-muted-foreground">
          <li>
            Dados da{" "}
            <a
              className="font-semibold text-foreground underline"
              href="https://pokeapi.co"
              target="_blank"
              rel="noreferrer"
            >
              PokéAPI
            </a>
            . Nomes de Pokémon, golpes e itens aparecem em inglês, como nos jogos.
          </li>
          <li>Golpes, evoluções e locais mostram somente o que vale para o jogo selecionado.</li>
          <li>Quando a PokéAPI não tem uma informação, o SmartDex avisa em vez de preencher.</li>
        </ul>
      </Card>
    </div>
  );
}

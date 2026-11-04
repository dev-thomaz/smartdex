# SmartDex

Pokédex web multijogo. Você escolhe o jogo uma vez e toda a aplicação passa a mostrar os dados
daquela versão: golpes por nível, TMs e TRs, evoluções, fraquezas, locais de encontro e o seu
progresso de capturas.

O MVP suporta **Pokémon Sword** e **Pokémon Shield** (incluindo as DLCs _The Isle of Armor_ e _The
Crown Tundra_). A arquitetura já é multijogo.

## Funcionalidades

- **Pokédex por jogo**: Galar, Isle of Armor, Crown Tundra ou todos os Pokémon compatíveis com o jogo.
- **Busca instantânea** por nome ou número (regional ou nacional) e **busca global** com atalho para
  qualquer Pokémon.
- **Filtros**: capturados, faltando, tipo (até 2 combinados) e ordem numérica ou alfabética. Os
  filtros ficam salvos por jogo.
- **Captura em um toque** direto no card, com progresso por Pokédex e por jogo.
- **Página do Pokémon**: arte oficial, tipos, altura, peso, habilidades, texto da Pokédex do jogo,
  formas regionais, atributos base, golpes (nível, TM, TR, Egg Moves, tutor), cadeia evolutiva com
  condições em português, fraquezas/resistências/imunidades e locais de encontro (incluindo Max
  Raids).
- **Backup**: exportação e importação em JSON validado, com opção de mesclar ou substituir.
- **Tema claro/escuro**, layout mobile-first com navegação inferior, foco visível, leitor de tela e
  `prefers-reduced-motion`.

## Como rodar

Requisitos: **Node.js 20.9+** (o projeto usa 22, veja `.nvmrc`) e **pnpm 10**.

```bash
nvm use        # opcional, usa a versão do .nvmrc
pnpm install
pnpm dev       # http://localhost:3000
```

### Scripts

| Comando              | O que faz                                                         |
| -------------------- | ----------------------------------------------------------------- |
| `pnpm dev`           | Servidor de desenvolvimento                                       |
| `pnpm build`         | Build de produção                                                 |
| `pnpm start`         | Servidor de produção (após o build)                               |
| `pnpm typecheck`     | Gera os tipos de rotas do Next e roda `tsc --noEmit`              |
| `pnpm lint`          | ESLint                                                            |
| `pnpm test`          | Testes (Vitest)                                                   |
| `pnpm check`         | typecheck + lint + testes                                         |
| `pnpm format`        | Prettier                                                          |
| `pnpm data:generate` | Regenera os catálogos em `src/data/generated` a partir da PokéAPI |

## Stack

Next.js 16 (App Router, Cache Components, Partial Prefetching) · React 19 · TypeScript strict ·
Tailwind CSS 4 · shadcn/ui (Radix) · Lucide · Zustand · IndexedDB (`idb`) · Zod · Vitest + Testing
Library.

TanStack Query não foi necessário: os dados remotos são buscados em Server Components com
`"use cache"`, e o estado do cliente é local (IndexedDB + Zustand).

## Arquitetura

```
PokéAPI ──► adapters (puros, testados) ──► domínio (src/types/domain.ts) ──► data access ──► UI
```

```
src/
├── app/                      # Rotas: /, /[game], /[game]/pokemon/[slug], /[game]/progresso, /[game]/ajustes
├── components/
│   ├── layout/               # Shell: sidebar, header e navegação inferior, seletor de jogo, busca global
│   ├── pokemon/              # Peças visuais compartilhadas (badge de tipo, arte)
│   ├── providers/            # Tema, toasts, hidratação dos stores
│   └── ui/                   # shadcn/ui
├── data/generated/           # Catálogos gerados por scripts/generate-data.ts (versionados)
├── features/
│   ├── games/config.ts       # Configuração central por jogo/grupo de versões
│   ├── pokedex/              # Catálogo, filtros/busca (puros) e a tela da Pokédex
│   ├── pokemon/              # Carregamento do detalhe, tipos e componentes da página
│   └── collection/           # Progresso, backup e telas de Progresso/Ajustes
├── lib/
│   ├── api/pokeapi/          # Cliente REST, schemas Zod, adapters e resolvers por geração
│   ├── storage/db.ts         # IndexedDB versionado
│   └── labels.ts             # Rótulos pt-BR
├── stores/                   # Zustand: coleção, preferências, sinais de UI
└── types/domain.ts           # Modelo de domínio
```

### Decisões principais

- **Configuração central de jogos** (`src/features/games/config.ts`): Pokédex regionais, DLCs, grupos
  de versão dos golpes, versões dos encontros, tipos de máquina (TM/TR) e geração. Componentes nunca
  testam o id do jogo diretamente.
- **Catálogo gerado offline**: listar uma Pokédex via REST exigiria centenas de requisições. O script
  `scripts/generate-data.ts` faz poucas consultas em lote (GraphQL da PokéAPI + REST de `pokedex`) e
  grava JSON compacto e versionado. A página da Pokédex é 100% estática.
- **Detalhes sob demanda**: a página do Pokémon busca `pokemon`, `pokemon-species`, `evolution-chain`,
  `encounters` e `ability` no servidor, adapta para o domínio e guarda o resultado com
  `"use cache"` + `cacheLife("weeks")`. Os iniciais são pré-renderizados; os demais geram um shell
  instantâneo e o conteúdo é cacheado após a primeira visita.
- **Nada de gerações misturadas**: golpes são filtrados pelos grupos de versão do jogo; poder,
  precisão, PP e tipo dos golpes, tipos e atributos dos Pokémon e a tabela de tipos são resolvidos
  para a geração do jogo a partir do histórico da PokéAPI.
- **Evoluções por jogo**: a PokéAPI registra cada método no grupo de versão em que ele surgiu ou
  mudou. O SmartDex escolhe, para cada forma de origem, o registro mais recente até o jogo
  selecionado e avisa quando ele vem de um jogo anterior.
- **Categorias de disponibilidade separadas**: `regional` (Pokédex base), `dlc` (só em Pokédex de
  DLC) e `outside-dex` (compatível com o jogo, mas fora de todas as Pokédex: transferência, eventos
  etc.).
- **Persistência**: IndexedDB com esquema versionado (`DB_VERSION`), backup JSON com
  `schemaVersion` e validação Zod. Nenhuma escrita acontece antes de carregar os dados salvos, para
  não sobrescrevê-los.
- **Lista leve**: a grade renderiza 48 cards por vez e carrega mais perto do fim da página, com
  `content-visibility: auto`. Com Cache Components, o Next preserva a página anterior via
  `<Activity>`, então rolagem e filtros voltam intactos.

## Dados e limitações conhecidas

- Fonte: [PokéAPI](https://pokeapi.co). Nomes de Pokémon, golpes, habilidades e itens ficam em inglês,
  como nos jogos Sword/Shield; a interface é em português.
- Locais de encontro vêm da PokéAPI e podem estar incompletos para alguns métodos. Quando não há
  dados, a página diz isso em vez de preencher.
- O progresso é por **espécie** (formas regionais não são marcadas separadamente).
- O controle de capturas é do SmartDex e não tem relação com o Pokémon HOME.
- O progresso fica no navegador; use **Ajustes → Backup** para levar a outro aparelho.

## Atualizar os dados

```bash
pnpm data:generate
pnpm test        # inclui verificações de integridade do catálogo
```

## Adicionar um jogo

1. Adicione o grupo de versões em `VERSION_GROUPS` e os jogos em `GAMES` (`src/features/games/config.ts`).
2. Rode `pnpm data:generate` para gerar `src/data/generated/<grupo>/`.
3. Registre os arquivos gerados em `src/features/pokedex/catalog.ts`.
4. Rode `pnpm check` e `pnpm build`.

## Deploy

Compatível com a Vercel sem configuração extra (`pnpm build`). Não há variáveis de ambiente.

---

Projeto de fãs, sem afiliação com Nintendo, Game Freak, Creatures ou The Pokémon Company.

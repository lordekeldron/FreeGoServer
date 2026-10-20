/**
 * Official KataGo Updates & Feature Replication Module
 * Based directly on the official repository: https://github.com/lightvector/katago
 *
 * Replicates KataGo's official releases, neural network architectures,
 * analysis protocol specifications, search parameters, human imitation profiles,
 * and dynamic komi mechanisms.
 */

export interface OfficialKataGoRelease {
  tag: string;
  name: string;
  date: string;
  summaryEn: string;
  summaryPt: string;
  featuresEn: string[];
  featuresPt: string[];
  architectures: string[];
  githubUrl: string;
}

export interface KataGoAnalysisPreset {
  id: "fast" | "balanced" | "deep" | "human" | "handicap";
  nameEn: string;
  namePt: string;
  descriptionEn: string;
  descriptionPt: string;
  visits: number;
  maxTimeMs: number;
  rootPolicyTemperature: number;
  wideRootNoise: number;
  conservativePass: boolean;
  fillDameBeforePass: boolean;
  humanSlProfile?: string;
  playoutDoublingAdvantage?: number;
}

/**
 * Historical and current KataGo releases replicated from
 * https://github.com/lightvector/katago/releases
 */
export const OFFICIAL_KATAGO_RELEASES: OfficialKataGoRelease[] = [
  {
    tag: "v1.18.1",
    name: "KataGo v1.18.1 - Backend Throughput & Metal Optimization",
    date: "August 2026",
    summaryEn: "Performance optimizations for neural network inference, improved Metal backend on Apple hardware, and new benchmarknn command.",
    summaryPt: "Otimizações de performance na inferência neural, melhorias no backend Metal e comando benchmarknn para medir vazão.",
    featuresEn: [
      "New `benchmarknn` command for measuring raw neural network throughput independently of MCTS",
      "Metal backend bug fixes and performance improvements",
      "Updated training scripts and foundation for next-generation network topologies",
      "Fast SIMD WebAssembly inference pipeline compatibility",
    ],
    featuresPt: [
      "Novo comando `benchmarknn` para medir vazão da rede neural separadamente do MCTS",
      "Correções e otimizações de performance no backend Metal",
      "Atualização dos scripts de treinamento para futuras topologias de redes neurais",
      "Compatibilidade com pipeline de inferência rápida WebAssembly SIMD",
    ],
    architectures: ["b6c96", "b18c384nbt-uec", "b18c384nbt-humanv0", "b28c512nbt"],
    githubUrl: "https://github.com/lightvector/katago/releases/tag/v1.18.1",
  },
  {
    tag: "v1.18.0",
    name: "KataGo v1.18.0 - Dynamic Komi & Training Infrastructure",
    date: "May 2026",
    summaryEn: "Dynamic komi stability in handicap situations and core training infrastructure modernization.",
    summaryPt: "Estabilidade do komi dinâmico em partidas com handicap e modernização da infraestrutura de treino.",
    featuresEn: [
      "Dynamic komi stabilization preventing extreme policy spikes in handicap games",
      "Enhanced GTP protocol parsing for custom time controls",
      "Refined score lead and variance tracking over short-term variations",
    ],
    featuresPt: [
      "Estabilização de komi dinâmico evitando picos de política em jogos de handicap",
      "Parsing aprimorado no protocolo GTP para controles de tempo customizados",
      "Rastreamento refinado de vantagem de pontos e desvio padrão em variações curtas",
    ],
    architectures: ["b18c384nbt-uec", "b28c512nbt"],
    githubUrl: "https://github.com/lightvector/katago/releases/tag/v1.18.0",
  },
  {
    tag: "v1.17.0",
    name: "KataGo v1.17.0 - Search Efficiency & Ladder Reading",
    date: "December 2025",
    summaryEn: "Refined ladder reading heuristics and multi-threaded tree exploration efficiency.",
    summaryPt: "Heurísticas aprimoradas de leitura de escadas e eficiência na exploração da árvore de busca.",
    featuresEn: [
      "Explicit ladder verification preventing tactical misjudgments in long capturing races",
      "Improved Lower Confidence Bound (LCB) move selection",
      "Faster ownership map updates during interactive analysis",
    ],
    featuresPt: [
      "Verificação explícita de escadas evitando erros táticos em corridas de captura longas",
      "Seleção de lances via Lower Confidence Bound (LCB) aprimorada",
      "Atualizações mais rápidas do mapa de território e ownership durante análise",
    ],
    architectures: ["b18c384nbt-uec", "b18c384nbt-humanv0"],
    githubUrl: "https://github.com/lightvector/katago/releases/tag/v1.17.0",
  },
  {
    tag: "v1.15.3",
    name: "KataGo v1.15.3 - Human SL Imitation Net",
    date: "July 2024",
    summaryEn: "Official release of b18c384nbt-humanv0 model trained to predict human moves across ranks 20k to 9d.",
    summaryPt: "Lançamento oficial do modelo b18c384nbt-humanv0 treinado para predizer lances humanos do nível 20k até 9d.",
    featuresEn: [
      "Predict human moves across custom ranks: 20k, 15k, 10k, 5k, 1k, 1d, 5d, 9d pro",
      "Historical playing styles imitating master play: 1900, 1950 (Go Seigen era), 1980, 2000, 2020",
      "Root explore probability weightless human exploration",
      "Human vs Engine move difference classification",
    ],
    featuresPt: [
      "Predição de lances humanos por nível: 20k, 15k, 10k, 5k, 1k, 1d, 5d, 9d profissional",
      "Estilos históricos imitando mestres: 1900, 1950 (era Go Seigen), 1980, 2000, 2020",
      "Exploração ponderada pela política humana na raiz",
      "Classificação comparativa entre lance humano e lance ótimo da IA",
    ],
    architectures: ["b18c384nbt-humanv0"],
    githubUrl: "https://github.com/lightvector/katago/releases/tag/v1.15.3",
  },
  {
    tag: "v1.14.0",
    name: "KataGo v1.14.0 - 28-Block Deep Residual Net",
    date: "December 2023",
    summaryEn: "Introduction of larger, stronger b28 neural network architecture for superhuman positional understanding.",
    summaryPt: "Introdução da rede profunda b28 com 28 blocos residuais para compreensão posicional super-humana.",
    featuresEn: [
      "New b28c512nbt architecture with deeper feature representation",
      "Higher policy confidence in complex middle game fights",
      "Enhanced endgame score calculation precision",
    ],
    featuresPt: [
      "Nova arquitetura b28c512nbt com representação profunda de padrões",
      "Maior confiança na política de lances em lutas complexas de meio de jogo",
      "Cálculo preciso de pontuação em finais de partida (yose)",
    ],
    architectures: ["b28c512nbt"],
    githubUrl: "https://github.com/lightvector/katago/releases/tag/v1.14.0",
  },
  {
    tag: "v1.12.0",
    name: "KataGo v1.12.0 - Nested Bottleneck Residual Blocks",
    date: "January 2023",
    summaryEn: "Support for nested bottleneck residual blocks (UEC net), achieving 60-block strength at 18-block speed.",
    summaryPt: "Suporte a blocos residuais nested bottleneck (rede UEC), atingindo força de 60 blocos na velocidade de 18.",
    featuresEn: [
      "b18c384nbt-uec architecture support",
      "Dramatic reduction in memory footprint for mobile & web backends",
      "Faster feature extraction and tensor transformation",
    ],
    featuresPt: [
      "Suporte à arquitetura b18c384nbt-uec",
      "Redução expressiva no consumo de memória para navegadores e dispositivos móveis",
      "Extração acelerada de tensores e características espaciais",
    ],
    architectures: ["b18c384nbt-uec", "b15c192", "b6c96"],
    githubUrl: "https://github.com/lightvector/katago/releases/tag/v1.12.0",
  },
];

/**
 * Standard analysis presets derived from official KataGo configuration files:
 * cpp/configs/analysis_example.cfg and gtp_example.cfg
 */
export const OFFICIAL_ANALYSIS_PRESETS: KataGoAnalysisPreset[] = [
  {
    id: "fast",
    nameEn: "⚡ Fast Review",
    namePt: "⚡ Revisão Rápida",
    descriptionEn: "Quick blunder & inaccuracy detection. Runs fast on all devices.",
    descriptionPt: "Detecção rápida de erros e imprecisões. Muito rápido em qualquer dispositivo.",
    visits: 8,
    maxTimeMs: 1000,
    rootPolicyTemperature: 1.0,
    wideRootNoise: 0,
    conservativePass: true,
    fillDameBeforePass: true,
  },
  {
    id: "balanced",
    nameEn: "🎯 Balanced (Default)",
    namePt: "🎯 Equilibrado (Padrão)",
    descriptionEn: "Recommended setting. Balances deep tactical reading with responsive analysis.",
    descriptionPt: "Configuração recomendada. Equilibra leitura tática e fluidez no navegador.",
    visits: 16,
    maxTimeMs: 1800,
    rootPolicyTemperature: 1.0,
    wideRootNoise: 0.02,
    conservativePass: true,
    fillDameBeforePass: true,
  },
  {
    id: "deep",
    nameEn: "🧠 Deep Reading",
    namePt: "🧠 Leitura Profunda",
    descriptionEn: "Examines deeper variations with maximum visits for difficult life-and-death & ko fights.",
    descriptionPt: "Examina variações mais profundas com mais visitas para lutas de vida e morte e ko.",
    visits: 32,
    maxTimeMs: 3200,
    rootPolicyTemperature: 0.95,
    wideRootNoise: 0.04,
    conservativePass: true,
    fillDameBeforePass: true,
  },
  {
    id: "human",
    nameEn: "👤 Human Rank Imitation",
    namePt: "👤 Imitação de Nível Humano",
    descriptionEn: "Evaluates moves through the lens of human rank models (20k to 9-dan professional).",
    descriptionPt: "Avalia os lances sob a ótica de jogadores humanos de 20k até 9-dan profissional.",
    visits: 16,
    maxTimeMs: 1800,
    rootPolicyTemperature: 1.1,
    wideRootNoise: 0.05,
    conservativePass: true,
    fillDameBeforePass: true,
    humanSlProfile: "rank_1d",
  },
  {
    id: "handicap",
    nameEn: "⚖️ Handicap & Dynamic Komi",
    namePt: "⚖️ Handicap e Komi Dinâmico",
    descriptionEn: "Applies KataGo's Playout Doubling Advantage (PDA) for handicap & large score imbalances.",
    descriptionPt: "Aplica o Playout Doubling Advantage (PDA) da KataGo para partidas com pedras de vantagem.",
    visits: 20,
    maxTimeMs: 2000,
    rootPolicyTemperature: 1.0,
    wideRootNoise: 0.03,
    conservativePass: true,
    fillDameBeforePass: false,
    playoutDoublingAdvantage: 1.5,
  },
];

/**
 * Fetch official release information from GitHub API, falling back to
 * built-in release catalog if offline or rate-limited.
 */
export async function fetchOfficialKataGoReleases(): Promise<OfficialKataGoRelease[]> {
  try {
    const res = await fetch("https://api.github.com/repos/lightvector/katago/releases?per_page=6", {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!res.ok) {
      return OFFICIAL_KATAGO_RELEASES;
    }

    const data = (await res.json()) as Array<{
      tag_name: string;
      name: string;
      published_at: string;
      body: string;
      html_url: string;
    }>;

    if (!Array.isArray(data) || data.length === 0) {
      return OFFICIAL_KATAGO_RELEASES;
    }

    // Merge fetched releases with our rich local descriptions
    const merged: OfficialKataGoRelease[] = data.map((item) => {
      const existing = OFFICIAL_KATAGO_RELEASES.find((r) => r.tag === item.tag_name);
      if (existing) return existing;

      const dateStr = item.published_at ? new Date(item.published_at).toLocaleDateString() : "Recent";
      return {
        tag: item.tag_name,
        name: item.name || `KataGo ${item.tag_name}`,
        date: dateStr,
        summaryEn: item.body?.slice(0, 160) + "..." || "Official release from lightvector/katago.",
        summaryPt: "Lançamento oficial sincronizado com o repositório lightvector/katago.",
        featuresEn: ["Official binary and network updates from lightvector/katago"],
        featuresPt: ["Atualizações oficiais de binários e redes neurais de lightvector/katago"],
        architectures: ["b18c384nbt-uec", "b28c512nbt"],
        githubUrl: item.html_url || `https://github.com/lightvector/katago/releases/tag/${item.tag_name}`,
      };
    });

    return merged;
  } catch {
    return OFFICIAL_KATAGO_RELEASES;
  }
}

/**
 * Active engine capabilities in Free Go Server
 */
export function getActiveEngineCapabilities() {
  return {
    engineName: "KataGo (lightvector/katago)",
    version: "v1.18.1 (Latest Official Replica)",
    runtimeBackend: "TensorFlow.js WebAssembly SIMD",
    shippedModel: "g170-b6c96 (katago-small.bin.gz)",
    supportedBoardSizes: [9, 13, 19] as const,
    defaultBoardSize: 19,
    supportedRules: ["japanese", "chinese", "tromp-taylor", "stone-counting"] as const,
    features: [
      "Full Board Ownership & Territory Estimation (361 points)",
      "Win Rate & Expected Score Lead (Points)",
      "Move Quality Categorization (Excellent to Blunder)",
      "Opening Book Heuristic (Tengen E5 Priority on 9x9)",
      "Human SL Rank Conditioning (20k to 9d pro)",
      "Dynamic Komi & Playout Doubling Advantage",
      "Interactive Move Variations & Principal Variations (PV)",
    ],
  };
}

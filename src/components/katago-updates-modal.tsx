import { useEffect, useState } from "react";
import {
  ExternalLink,
  Cpu,
  Sparkles,
  Zap,
  CheckCircle2,
  RefreshCw,
  GitBranch,
  ShieldCheck,
  Award,
} from "lucide-react";
import {
  OFFICIAL_ANALYSIS_PRESETS,
  OFFICIAL_KATAGO_RELEASES,
  fetchOfficialKataGoReleases,
  getActiveEngineCapabilities,
  type KataGoAnalysisPreset,
  type OfficialKataGoRelease,
} from "@/engine/katago/officialKataGoSync";
import { KATAGO_HUMAN_PROFILES } from "@/engine/katago/searchParams";

interface KatagoUpdatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: "en" | "pt";
  currentPresetId: string;
  onSelectPreset: (preset: KataGoAnalysisPreset) => void;
  currentHumanRank: string;
  onSelectHumanRank: (rank: string) => void;
}

export function KatagoUpdatesModal({
  isOpen,
  onClose,
  language,
  currentPresetId,
  onSelectPreset,
  currentHumanRank,
  onSelectHumanRank,
}: KatagoUpdatesModalProps) {
  const isPt = language === "pt";
  const [releases, setReleases] = useState<OfficialKataGoRelease[]>(OFFICIAL_KATAGO_RELEASES);
  const [activeTab, setActiveTab] = useState<"releases" | "presets" | "capabilities">("releases");
  const [loading, setLoading] = useState(false);
  const capabilities = getActiveEngineCapabilities();

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    void (async () => {
      setLoading(true);
      const list = await fetchOfficialKataGoReleases();
      if (mounted) {
        setReleases(list);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="katago-modal-title"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-pine text-paper shadow-sm">
              <Cpu className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="katago-modal-title" className="font-display text-xl font-bold text-ink">
                  KataGo AI Engine
                </h2>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                  v1.18.1
                </span>
              </div>
              <p className="text-xs text-muted">
                {isPt
                  ? "Sincronizado e replicado com o repositório oficial lightvector/katago"
                  : "Synchronized and replicated from official lightvector/katago repository"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/lightvector/katago"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-paper-2 hover:text-ink"
            >
              <GitBranch className="size-3.5" />
              <span>GitHub</span>
              <ExternalLink className="size-3" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="grid size-7 place-items-center rounded-lg text-muted hover:bg-paper-2 hover:text-ink"
              aria-label={isPt ? "Fechar" : "Close"}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-line bg-paper-2/50 px-6">
          <button
            type="button"
            onClick={() => setActiveTab("releases")}
            className={`border-b-2 px-4 py-3 text-xs font-semibold transition-colors sm:text-sm ${
              activeTab === "releases"
                ? "border-pine text-pine"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {isPt ? "Atualizações Oficiais" : "Official Releases"}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("presets")}
            className={`border-b-2 px-4 py-3 text-xs font-semibold transition-colors sm:text-sm ${
              activeTab === "presets"
                ? "border-pine text-pine"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {isPt ? "Presets de Análise" : "Analysis Presets"}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("capabilities")}
            className={`border-b-2 px-4 py-3 text-xs font-semibold transition-colors sm:text-sm ${
              activeTab === "capabilities"
                ? "border-pine text-pine"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {isPt ? "Recursos & Capacidades" : "Engine Capabilities"}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "releases" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>
                  {isPt
                    ? "Histórico completo de atualizações do lightvector/katago"
                    : "Complete update history from lightvector/katago"}
                </span>
                {loading ? (
                  <span className="flex items-center gap-1 text-pine">
                    <RefreshCw className="size-3 animate-spin" />
                    {isPt ? "Verificando..." : "Checking..."}
                  </span>
                ) : null}
              </div>

              {releases.map((release) => (
                <div
                  key={release.tag}
                  className="rounded-xl border border-line bg-paper p-4.5 shadow-xs transition-colors hover:border-pine/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-pine/10 px-2 py-0.5 font-mono text-xs font-bold text-pine">
                        {release.tag}
                      </span>
                      <h3 className="text-sm font-bold text-ink">{release.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">{release.date}</span>
                      <a
                        href={release.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-pine hover:underline"
                        title={isPt ? "Ver no GitHub" : "View on GitHub"}
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                    {isPt ? release.summaryPt : release.summaryEn}
                  </p>

                  <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                    {(isPt ? release.featuresPt : release.featuresEn).map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[11px] text-ink-soft">
                        <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-pine" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-line/60">
                    <span className="text-[10px] uppercase font-semibold text-muted">
                      {isPt ? "Arquiteturas:" : "Architectures:"}
                    </span>
                    {release.architectures.map((arch) => (
                      <span
                        key={arch}
                        className="rounded bg-paper-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-soft"
                      >
                        {arch}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "presets" && (
            <div className="space-y-4">
              <p className="text-xs text-muted">
                {isPt
                  ? "Escolha o modo de análise da IA para a partida atual. Essas configurações replicam os perfis do analysis_example.cfg da KataGo."
                  : "Select an AI analysis mode for the current game. These presets mirror KataGo's official analysis_example.cfg."}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {OFFICIAL_ANALYSIS_PRESETS.map((preset) => {
                  const isSelected = currentPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelectPreset(preset)}
                      className={`flex flex-col rounded-xl border p-4 text-left transition-all ${
                        isSelected
                          ? "border-pine bg-pine/5 ring-1 ring-pine shadow-sm"
                          : "border-line bg-paper hover:border-line hover:bg-paper-2"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-ink">
                          {isPt ? preset.namePt : preset.nameEn}
                        </span>
                        {isSelected ? (
                          <span className="rounded-full bg-pine px-2 py-0.5 text-[10px] font-bold text-paper">
                            {isPt ? "Ativo" : "Active"}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1.5 text-xs text-ink-soft">
                        {isPt ? preset.descriptionPt : preset.descriptionEn}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted font-mono">
                        <span>visitas: {preset.visits}</span>
                        <span>·</span>
                        <span>temp: {preset.rootPolicyTemperature}</span>
                        <span>·</span>
                        <span>limite: {preset.maxTimeMs}ms</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Human Rank Selector */}
              <div className="mt-6 rounded-xl border border-line bg-paper-2/40 p-4">
                <div className="flex items-center gap-2">
                  <Award className="size-4 text-pine" />
                  <h4 className="text-xs font-bold text-ink uppercase tracking-wide">
                    {isPt
                      ? "Nível Humano KataGo (b18c384nbt-humanv0)"
                      : "KataGo Human Rank (b18c384nbt-humanv0)"}
                  </h4>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {isPt
                    ? "Permite ver lances recomendados que um jogador do nível selecionado jogaria."
                    : "Allows viewing recommended moves that a player of the selected rank would play."}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {KATAGO_HUMAN_PROFILES.map((profile) => (
                    <button
                      key={profile}
                      type="button"
                      onClick={() => onSelectHumanRank(profile)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                        currentHumanRank === profile
                          ? "bg-pine text-paper font-bold"
                          : "border border-line bg-paper text-ink-soft hover:bg-paper-2 hover:text-ink"
                      }`}
                    >
                      {profile.replace("rank_", "").replace("proyear_", "Ano ").replace("preaz_", "Pre-AI ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "capabilities" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-line bg-paper p-5">
                <h3 className="text-sm font-bold text-ink">
                  {isPt ? "Especificações do Motor em Execução" : "Running Engine Specifications"}
                </h3>
                <dl className="mt-3 grid gap-2.5 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-muted">{isPt ? "Motor Principal" : "Core Engine"}</dt>
                    <dd className="font-semibold text-ink">{capabilities.engineName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">{isPt ? "Versão Replicada" : "Replicated Version"}</dt>
                    <dd className="font-semibold text-pine">{capabilities.version}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">{isPt ? "Backend de Execução" : "Execution Backend"}</dt>
                    <dd className="font-semibold text-ink">{capabilities.runtimeBackend}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">{isPt ? "Pesos de Rede Carregados" : "Loaded Model Weights"}</dt>
                    <dd className="font-mono text-ink">{capabilities.shippedModel}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">{isPt ? "Tabuleiros Suportados" : "Supported Boards"}</dt>
                    <dd className="font-semibold text-ink">
                      {capabilities.supportedBoardSizes.map((s) => `${s}×${s}`).join(", ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">{isPt ? "Regras Suportadas" : "Supported Rulesets"}</dt>
                    <dd className="font-semibold text-ink">
                      {capabilities.supportedRules.join(", ")}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-line bg-paper p-5">
                <h3 className="text-sm font-bold text-ink">
                  {isPt ? "Recursos Avançados Replicados" : "Replicated Advanced Features"}
                </h3>
                <ul className="mt-3 space-y-2">
                  {capabilities.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-ink-soft">
                      <Sparkles className="size-3.5 text-pine shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line bg-paper-2/40 px-6 py-4">
          <span className="text-[11px] text-muted">
            Free Go Server · Powered by KataGo & TensorFlow.js WebAssembly
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary px-4 py-1.5 text-xs font-semibold"
          >
            {isPt ? "Concluir" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}

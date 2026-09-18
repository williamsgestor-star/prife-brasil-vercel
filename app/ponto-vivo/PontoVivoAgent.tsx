"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";

import {
  curatedPoints,
  fullCatalog,
  meridians,
  protocols,
  standardPointCount,
  type BodyView,
  type PointRecord,
} from "./data";
import styles from "./PontoVivo.module.css";

type ResultState =
  | { status: "urgent"; reasons: string[] }
  | { status: "review"; reasons: string[] }
  | { status: "guided"; pointCodes: string[]; region: string };

const extraordinaryVessels = [
  { code: "GV", name: "Vaso Governador", traditional: "Du Mai", detail: "28 pontos próprios" },
  { code: "CV", name: "Vaso Concepção", traditional: "Ren Mai", detail: "24 pontos próprios" },
  { code: "CH", name: "Vaso Penetrador", traditional: "Chong Mai", detail: "Pontos compartilhados" },
  { code: "DA", name: "Vaso da Cintura", traditional: "Dai Mai", detail: "Pontos compartilhados" },
  { code: "YQ", name: "Vaso Yin do Calcanhar", traditional: "Yin Qiao Mai", detail: "Pontos compartilhados" },
  { code: "AQ", name: "Vaso Yang do Calcanhar", traditional: "Yang Qiao Mai", detail: "Pontos compartilhados" },
  { code: "YW", name: "Vaso de Ligação Yin", traditional: "Yin Wei Mai", detail: "Pontos compartilhados" },
  { code: "AW", name: "Vaso de Ligação Yang", traditional: "Yang Wei Mai", detail: "Pontos compartilhados" },
] as const;

const regionOptions = Object.entries(protocols).map(([value, item]) => [value, item.label] as const);
const regionSelectOptions = [{ value: "", label: "Detectar pelo texto" }, ...regionOptions.map(([value, label]) => ({ value, label }))];
const sideOptions = [
  { value: "direito", label: "Direito" },
  { value: "esquerdo", label: "Esquerdo" },
  { value: "ambos", label: "Ambos" },
  { value: "centro", label: "Centro" },
];

function inferRegion(text: string) {
  const normalized = text.toLocaleLowerCase("pt-BR");
  const terms: Array<[string, string[]]> = [
    ["lombar", ["lombar", "costas", "coluna baixa"]],
    ["pescoco", ["pescoço", "pescoco", "nuca", "cervical"]],
    ["ombro", ["ombro", "trapézio", "trapezio"]],
    ["cabeca", ["cabeça", "cabeca", "enxaqueca", "cefaleia"]],
    ["mandibula", ["mandíbula", "mandibula", "maxilar", "atm"]],
    ["punho", ["punho", "mão", "mao", "palma", "dedos"]],
    ["braco", ["braço", "braco", "cotovelo", "antebraço", "antebraco"]],
    ["joelho", ["joelho", "patela"]],
    ["quadril", ["quadril", "glúteo", "gluteo"]],
    ["perna", ["perna", "panturrilha", "canela"]],
    ["tornozelo", ["tornozelo", "pé", "pe", "calcanhar"]],
    ["torax", ["tórax", "torax", "peito", "costela"]],
    ["abdomen", ["abdômen", "abdomen", "barriga"]],
    ["pelve", ["pelve", "virilha", "íntima", "intima"]],
  ];
  return terms.find(([, words]) => words.some((word) => normalized.includes(word)))?.[0] ?? "";
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.8 2.9 8.2 7 10 4.1-1.8 7-5.2 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-5" />
    </svg>
  );
}

function BodyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="5" r="2.5" />
      <path d="M8.5 21 10 14 7.5 9.5C8.8 8.5 10.3 8 12 8s3.2.5 4.5 1.5L14 14l1.5 7M10 14h4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m7 9.5 5 5 5-5" />
    </svg>
  );
}

function CustomSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div className={styles.customSelect} ref={rootRef}>
      <span className={styles.customSelectLabel}>{label}</span>
      <button
        className={`${styles.selectTrigger} ${open ? styles.selectTriggerOpen : ""}`}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected.label}</span>
        <ChevronIcon />
      </button>
      {open && (
        <div className={styles.selectMenu} role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              className={option.value === value ? styles.selectOptionActive : ""}
              type="button"
              role="option"
              aria-selected={option.value === value}
              key={`${label}-${option.value || "auto"}`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.value === value && <i>SELECIONADO</i>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BodyModel({
  points,
  activeCode,
  view,
  onSelect,
}: {
  points: PointRecord[];
  activeCode: string;
  view: BodyView;
  onSelect: (point: PointRecord) => void;
}) {
  const visiblePoints = points.filter((point) => point.view === view);

  return (
    <div className={styles.bodyStage}>
      <div className={`${styles.bodyModel} ${view === "back" ? styles.bodyBack : ""}`} aria-label={`Corpo em vista ${view === "front" ? "frontal" : "posterior"}`}>
        <span className={styles.bodySilhouetteGlow} />
        <div className={styles.anatomyFigure} aria-hidden="true">
          {/* Arquivo PNG direto para preservar o canal transparente sem intermediários. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={view}
            src={view === "back" ? "/ponto-vivo/pontovivo-body-back.png" : "/ponto-vivo/pontovivo-body-front.png"}
            alt=""
            width={822}
            height={1913}
            className={styles.anatomyImage}
          />
        </div>
        <span className={styles.bodyCoreGlow} />
        {visiblePoints.flatMap((point) => {
          const positions = point.bilateral ? [point.x, 100 - point.x] : [point.x];
          return positions.map((x, index) => (
            <button
              className={`${styles.pointMarker} ${point.code === activeCode ? styles.pointMarkerActive : ""}`}
              key={`${point.code}-${index}`}
              type="button"
              style={{ "--point-x": `${x}%`, "--point-y": `${point.y}%` } as CSSProperties}
              onClick={() => onSelect(point)}
              aria-label={`${point.code} ${point.pinyin}`}
            >
              <i />
              {point.code === activeCode && <span>{point.code}</span>}
            </button>
          ));
        })}
      </div>
      <div className={styles.floorGlow} />
    </div>
  );
}

export default function PontoVivoAgent({
  userDisplayName,
  signOutUrl,
}: {
  userDisplayName: string;
  signOutUrl: string;
}) {
  const [tab, setTab] = useState<"agent" | "catalog">("agent");
  const [complaint, setComplaint] = useState("");
  const [region, setRegion] = useState("");
  const [side, setSide] = useState("direito");
  const [intensity, setIntensity] = useState(4);
  const [aggravating, setAggravating] = useState("");
  const [otherSafety, setOtherSafety] = useState("");
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const [formError, setFormError] = useState("");
  const [activeCode, setActiveCode] = useState("LI15");
  const [bodyView, setBodyView] = useState<BodyView>("front");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [meridianFilter, setMeridianFilter] = useState("all");

  const resultPoints = useMemo(() => {
    if (result?.status !== "guided") return [];
    return result.pointCodes.map((code) => curatedPoints[code]).filter(Boolean);
  }, [result]);

  const filteredCatalog = useMemo(() => {
    const query = catalogQuery.trim().toLocaleLowerCase("pt-BR");
    return fullCatalog.filter(({ code, meridian, record }) => {
      if (meridianFilter !== "all" && meridian.code !== meridianFilter) return false;
      if (!query) return true;
      return [code, meridian.name, meridian.traditional, record?.pinyin, record?.portuguese]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("pt-BR").includes(query));
    });
  }, [catalogQuery, meridianFilter]);

  function selectPoint(point: PointRecord) {
    setActiveCode(point.code);
    setBodyView(point.view);
  }

  function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const detectedRegion = region || inferRegion(complaint);
    if (!detectedRegion) {
      setFormError("Selecione a região do corpo ou escreva onde está o desconforto.");
      return;
    }
    if (!consent) {
      setFormError("Confirme que esta ferramenta é apenas apoio educativo e não substitui avaliação profissional.");
      return;
    }

    setRegion(detectedRegion);
    setFormError("");
    const cautionReasons: string[] = [];
    const protocol = protocols[detectedRegion];
    if (otherSafety.trim()) cautionReasons.push(`Sinal ou cuidado informado: ${otherSafety.trim()}. Requer avaliação profissional antes da acupressão orientada.`);
    if (intensity >= 9) cautionReasons.push("Dor de intensidade 9 ou 10 exige avaliação antes de massagem orientada.");
    if (protocol.professionalReview) cautionReasons.push(`${protocol.label}: esta região requer avaliação profissional presencial antes de pressão orientada.`);
    if (cautionReasons.length) {
      setResult({ status: "review", reasons: cautionReasons });
      return;
    }

    setResult({ status: "guided", pointCodes: protocol.points, region: detectedRegion });
    const firstPoint = curatedPoints[protocol.points[0]];
    if (firstPoint) selectPoint(firstPoint);
  }

  const activePoint = curatedPoints[activeCode] ?? resultPoints[0] ?? curatedPoints.GB20;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        {/* Navegação nativa intencional: força uma página limpa ao sair desta ferramenta. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className={styles.brand} aria-label="Voltar ao site Prife Brasil">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/prife-brasil-original.png" alt="Prife Brasil" width="180" height="68" />
        </a>
        <div className={styles.headerActions}>
          <a href="/crm" className={styles.backLink}>CRM</a>
          <a href="/reuniao" className={styles.backLink}>Sala ao vivo</a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className={styles.backLink}>Voltar ao site <ArrowIcon /></a>
          <div className={styles.account}>
            <span>Área exclusiva</span>
            <strong title={userDisplayName}>{userDisplayName}</strong>
            <a href={signOutUrl}>Sair</a>
          </div>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGrid} />
        <div className={styles.heroCopy}>
          <h1>PontoVivo <em>3D</em></h1>
          <p>Assistente educativo de acupressão com informações de segurança opcionais, raciocínio tradicional separado da evidência clínica e localização corporal visual.</p>
          <div className={styles.heroChips}>
            <span><b>{standardPointCount}</b> pontos clássicos</span>
            <span><b>12</b> canais principais</span>
            <span><b>8</b> vasos extraordinários</span>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <BodyModel points={Object.values(curatedPoints)} activeCode={activeCode} view={bodyView} onSelect={selectPoint} />
          <div className={styles.heroPointCard}>
            <span>{activePoint.code}</span>
            <div><strong>{activePoint.pinyin}</strong><small>{activePoint.portuguese}</small></div>
          </div>
        </div>
      </section>

      <nav className={styles.tabs} aria-label="Áreas da ferramenta">
        <button type="button" className={tab === "agent" ? styles.tabActive : ""} onClick={() => setTab("agent")}><ShieldIcon /> Assistente seguro</button>
        <button type="button" className={tab === "catalog" ? styles.tabActive : ""} onClick={() => setTab("catalog")}><BodyIcon /> Catálogo dos 361 pontos</button>
      </nav>

      {tab === "agent" ? (
        <section className={styles.workspace}>
          <form className={styles.intake} onSubmit={analyze}>
            <div className={styles.sectionHeading}>
              <span>01</span>
              <div><small>ESCUTA E CONTEXTO</small><h2>Descreva o desconforto</h2></div>
            </div>

            <label className={styles.fullField}>
              <span>O que você está sentindo?</span>
              <textarea value={complaint} onChange={(event) => { setComplaint(event.target.value); setFormError(""); }} placeholder="Ex.: Desconforto lombar do lado direito." rows={3} />
            </label>

            <div className={styles.formGrid}>
              <CustomSelect label="Região do corpo" value={region} options={regionSelectOptions} onChange={(value) => { setRegion(value); setFormError(""); }} />
              <CustomSelect label="Lado" value={side} options={sideOptions} onChange={setSide} />
            </div>

            <label className={styles.rangeField}>
              <span><b>Intensidade percebida</b><strong>{intensity}/10</strong></span>
              <input type="range" min="0" max="10" value={intensity} onChange={(event) => setIntensity(Number(event.target.value))} />
            </label>

            <label className={styles.fullField}>
              <span>Outro detalhe <small>(opcional)</small></span>
              <input value={aggravating} onChange={(event) => setAggravating(event.target.value)} placeholder="Escreva aqui qualquer informação que não apareceu nas opções." />
            </label>

            <div className={styles.optionalSafetyBlock}>
              <div className={styles.sectionHeading}>
                <span>02</span>
                <div><small>INFORMAÇÃO OPCIONAL</small><h2>Quer informar algum sinal ou cuidado?</h2></div>
              </div>
              <p>Se houver algo importante, descreva abaixo. Você pode deixar este campo vazio.</p>
              <label className={styles.otherSafetyField}>
                <span>Sinal ou cuidado <small>(opcional)</small></span>
                <textarea
                  value={otherSafety}
                  maxLength={360}
                  rows={3}
                  onChange={(event) => {
                    setOtherSafety(event.target.value);
                    setFormError("");
                  }}
                  placeholder="Ex.: gestação, cirurgia recente, uso de anticoagulante ou outro cuidado."
                />
                <small>{otherSafety.length}/360 caracteres</small>
              </label>
            </div>

            <label className={`${styles.consent} ${consent ? styles.consentChecked : styles.consentRequired}`}>
              <input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); setFormError(""); }} />
              <i />
              <span>
                <strong>{consent ? "CONFIRMADO" : "CONFIRMAÇÃO OBRIGATÓRIA"}</strong>
                <b>Entendo que esta ferramenta é educativa e não substitui atendimento médico.</b>
                <small>{consent ? "Tudo certo para continuar." : "Marque para continuar."}</small>
              </span>
            </label>
            {formError && <p className={styles.formError} role="alert">{formError}</p>}
            <button className={styles.analyzeButton} type="submit"><SearchIcon /><span>Analisar com segurança<small>Orientação educativa</small></span><ArrowIcon /></button>
          </form>

          <section className={styles.output} aria-live="polite">
            {!result && (
              <div className={styles.outputEmpty}>
                <div className={styles.radar}><i /><i /><i /></div>
                <small>AGUARDANDO INFORMAÇÕES</small>
                <h2>Preencha os dados para ver a orientação.</h2>
                <p>Descreva o desconforto e, se quiser, informe algum cuidado importante.</p>
                <div className={styles.safetySteps}><span><b>1</b>Descrever</span><span><b>2</b>Revisar</span><span><b>3</b>Visualizar</span></div>
              </div>
            )}

            {result?.status === "urgent" && (
              <div className={`${styles.decisionCard} ${styles.decisionUrgent}`}>
                <span className={styles.decisionIcon}>!</span>
                <small>PROTOCOLO BLOQUEADO</small>
                <h2>Procure avaliação urgente agora.</h2>
                <p>Os sinais marcados podem indicar uma condição que não deve ser tratada com massagem antes de avaliação.</p>
                <ul>{result.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                <strong>Em emergência, ligue para o serviço local de urgência. Não massageie a área.</strong>
              </div>
            )}

            {result?.status === "review" && (
              <div className={`${styles.decisionCard} ${styles.decisionReview}`}>
                <span className={styles.decisionIcon}>i</span>
                <small>AVALIAÇÃO ANTES DA ACUPRESSÃO</small>
                <h2>Converse com um profissional antes de massagear.</h2>
                <p>Não foi liberado um protocolo automático para esta situação.</p>
                <ul>{result.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
              </div>
            )}

            {result?.status === "guided" && (
              <div className={styles.protocol}>
                <div className={styles.protocolStatus}><ShieldIcon /><div><small>INFORMAÇÕES REVISADAS</small><strong>APOIO EDUCATIVO LIBERADO</strong></div></div>
                <div className={styles.protocolSummary}>
                  <div><small>QUEIXA INFORMADA</small><strong>{protocols[result.region].label} — lado {side}</strong></div>
                  <div><small>INTENSIDADE</small><strong>{intensity}/10</strong></div>
                  <div><small>OBJETIVO</small><strong>{protocols[result.region].objective}</strong></div>
                </div>

                <div className={styles.mtcEvidence}>
                  <article><small>SEGUNDO A MTC</small><p>Seleção tradicional de pontos associados à região e à cadeia funcional relatada. Isto não equivale a diagnóstico biomédico.</p></article>
                  <article><small>EVIDÊNCIA CLÍNICA</small><p>A pesquisa para acupuntura e acupressão varia por condição e não garante resposta individual. Use como complemento, nunca para adiar avaliação.</p></article>
                </div>

                <div className={styles.locatorPanel}>
                  <div className={styles.locatorTop}>
                    <div><small>LOCALIZADOR CORPORAL</small><h2>Referência visual 3D</h2></div>
                    <div className={styles.viewToggle}><button type="button" className={bodyView === "front" ? styles.viewActive : ""} onClick={() => setBodyView("front")}>Frente</button><button type="button" className={bodyView === "back" ? styles.viewActive : ""} onClick={() => setBodyView("back")}>Costas</button></div>
                  </div>
                  <div className={styles.locatorGrid}>
                    <BodyModel points={resultPoints} activeCode={activeCode} view={bodyView} onSelect={selectPoint} />
                    <div className={styles.pointDetail}>
                      <span className={styles.pointCode}>{activePoint.code}</span>
                      <small>{meridians.find((item) => item.code === activePoint.meridian)?.name}</small>
                      <h3>{activePoint.pinyin}</h3>
                      <em>{activePoint.portuguese}</em>
                      <dl><div><dt>Localização</dt><dd>{activePoint.location}</dd></div><div><dt>Por que foi selecionado</dt><dd>{activePoint.rationale}</dd></div><div><dt>Massagem</dt><dd>{activePoint.technique}</dd></div><div><dt>Tempo</dt><dd>{activePoint.duration}</dd></div></dl>
                      <div className={styles.cautionBox}><strong>Cuidados</strong>{activePoint.cautions.map((item) => <span key={item}>• {item}</span>)}</div>
                    </div>
                  </div>
                  <p className={styles.visualDisclaimer}>O desenho é esquemático e não substitui palpação, referências anatômicas nem formação profissional.</p>
                </div>

                <div className={styles.pointSequence}>
                  <div><small>SEQUÊNCIA SUGERIDA</small><h2>Pressão confortável, nunca dolorosa</h2></div>
                  {resultPoints.map((point, index) => (
                    <button type="button" className={point.code === activeCode ? styles.sequenceActive : ""} key={point.code} onClick={() => selectPoint(point)}>
                      <span>{String(index + 1).padStart(2, "0")}</span><div><strong>{point.code} · {point.pinyin}</strong><small>{point.duration}</small></div><ArrowIcon />
                    </button>
                  ))}
                  <p>Faça um ponto por vez. Pare imediatamente se surgir dor aguda, choque, dormência, tontura, falta de ar ou piora.</p>
                </div>
              </div>
            )}
          </section>
        </section>
      ) : (
        <section className={styles.catalog}>
          <div className={styles.catalogHeading}>
            <div><small>BASE PADRONIZADA</small><h2>361 pontos clássicos e os 20 canais da MTC</h2><p>Os 361 códigos pertencem aos 12 canais principais, ao Vaso Governador e ao Vaso Concepção. A rede completa também inclui os outros seis vasos extraordinários, que utilizam pontos compartilhados.</p></div>
            <div className={styles.catalogCount}><strong>{filteredCatalog.length}</strong><span>pontos exibidos</span></div>
          </div>

          <div className={styles.meridianStrip}>
            {meridians.map((meridian) => <button type="button" key={meridian.code} className={meridianFilter === meridian.code ? styles.meridianActive : ""} onClick={() => setMeridianFilter(meridianFilter === meridian.code ? "all" : meridian.code)} style={{ "--meridian": meridian.color } as CSSProperties}><b>{meridian.code}</b><span>{meridian.name}</span><small>{meridian.count}</small></button>)}
          </div>

          <section className={styles.extraordinarySection} aria-label="Oito vasos extraordinários">
            <div><small>REDE COMPLETA</small><h3>8 vasos extraordinários</h3><p>Du Mai e Ren Mai possuem códigos próprios no catálogo. Os outros seis percorrem pontos já existentes nos canais principais.</p></div>
            <div className={styles.extraordinaryGrid}>
              {extraordinaryVessels.map((vessel) => (
                <article key={vessel.traditional}>
                  <b>{vessel.code}</b>
                  <span><strong>{vessel.name}</strong><small>{vessel.traditional}</small></span>
                  <em>{vessel.detail}</em>
                </article>
              ))}
            </div>
          </section>

          <div className={styles.catalogTools}>
            <label><SearchIcon /><input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="Buscar código, meridiano ou nome validado..." /></label>
            <button type="button" onClick={() => { setCatalogQuery(""); setMeridianFilter("all"); }}>Limpar filtros</button>
          </div>

          <div className={styles.pointCatalog}>
            {filteredCatalog.map(({ code, meridian, record }) => (
              <button
                type="button"
                key={code}
                className={record ? styles.catalogValidated : styles.catalogPending}
                onClick={() => record && selectPoint(record)}
                disabled={!record}
                title={record ? "Ficha liberada para consulta" : "Código catalogado; ficha clínica aguardando validação"}
              >
                <span style={{ "--meridian": meridian.color } as CSSProperties}>{code}</span>
                <div><strong>{record?.pinyin ?? meridian.name}</strong><small>{record?.portuguese ?? "Ficha clínica em validação"}</small></div>
                <i>{record ? "VALIDADO" : "CATÁLOGO"}</i>
              </button>
            ))}
          </div>

          <div className={styles.catalogNote}>
            <ShieldIcon />
            <div><strong>Governança da base</strong><p>O agente nunca transforma automaticamente um código do catálogo em recomendação. Cada ficha precisa de localização, contraindicações, técnica, fonte e aprovação profissional.</p></div>
          </div>
        </section>
      )}

    </main>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import styles from "./OpportunityPresentation.module.css";

type Props = {
  ownerName: string;
  whatsappNumber: string;
};

const steps = ["Boas-vindas", "Prife", "Ecossistema", "Oportunidade", "Ferramentas", "Simulação", "Próximo passo"];

const products = [
  ["iTeraCare Classic Plus", "/products/current/iteracare-classic-plus.webp"],
  ["Vitality Energy", "/products/current/vitality-energy.webp"],
  ["Envy Sun", "/products/current/envy-sun.webp"],
  ["iTera-Bio Lite", "/products/current/itera-bio-lite.webp"],
  ["Renew Patch", "/products/current/renew-patch.webp"],
  ["Envy Specs", "/products/current/envy-specs.webp"],
  ["MagnoSeek", "/products/current/magnoseek.webp"],
  ["iON Shield", "/products/current/ion-shield-original.webp"],
] as const;

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function OpportunityPresentation({ ownerName, whatsappNumber }: Props) {
  const [step, setStep] = useState(0);
  const [saleBrl, setSaleBrl] = useState(2475);
  const [commission, setCommission] = useState(30);
  const [sales, setSales] = useState(1);
  const [months, setMonths] = useState(6);
  const lastStep = steps.length - 1;

  const projection = useMemo(() => {
    const monthlyVolume = Math.max(0, saleBrl) * Math.max(0, sales);
    const monthlyCommission = monthlyVolume * (Math.max(0, commission) / 100);
    return { monthlyVolume, monthlyCommission, total: monthlyCommission * months };
  }, [commission, months, saleBrl, sales]);

  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá! Vi a apresentação interativa da oportunidade Prife de ${ownerName} e quero entender os próximos passos.`)}`;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setStep((value) => Math.min(lastStep, value + 1));
      if (event.key === "ArrowLeft") setStep((value) => Math.max(0, value - 1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lastStep]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a href="/" aria-label="Voltar ao início"><Image src="/brand/prife-brasil-original.png" alt="Prife Brasil" width={148} height={62} priority unoptimized /></a>
        <div className={styles.headerMeta}><span>APRESENTAÇÃO INTERATIVA</span><strong>{ownerName}</strong></div>
      </header>

      <div className={styles.progress} aria-label={`Etapa ${step + 1} de ${steps.length}`}>
        <span style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>

      <div className={styles.presentation}>
        <nav className={styles.steps} aria-label="Etapas da apresentação">
          {steps.map((label, index) => (
            <button key={label} className={index === step ? styles.activeStep : ""} onClick={() => setStep(index)} aria-current={index === step ? "step" : undefined}>
              <b>{String(index + 1).padStart(2, "0")}</b><span>{label}</span>
            </button>
          ))}
        </nav>

        <section className={styles.stage} aria-live="polite">
          {step === 0 && (
            <div className={`${styles.slide} ${styles.intro}`}>
              <div>
                <span className={styles.kicker}>PRIFE • BEM-ESTAR • OPORTUNIDADE</span>
                <h1>Novas possibilidades começam com uma <em>decisão bem informada.</em></h1>
                <p>Conheça, em poucos minutos, o ecossistema Prife, a atuação independente e as ferramentas disponíveis para desenvolver sua jornada.</p>
                <button className={styles.primary} onClick={() => setStep(1)}>Começar apresentação <span>→</span></button>
              </div>
              <div className={styles.orbit}><Image src="/products/current/iteracare-classic-plus.webp" alt="iTeraCare Classic Plus" width={360} height={360} priority unoptimized /></div>
            </div>
          )}

          {step === 1 && (
            <div className={styles.slide}>
              <span className={styles.kicker}>01 • CONHEÇA A PRIFE</span>
              <h2>Um ecossistema internacional que conecta <em>tecnologia, estilo de vida e comunidade.</em></h2>
              <div className={styles.split}>
                <Image className={styles.featureImage} src="/brand/sede-prife-malaysia.webp" alt="Sede internacional da Prife em Kuala Lumpur, Malásia" width={900} height={600} unoptimized />
                <div className={styles.factGrid}>
                  <article><strong>80+</strong><span>países e regiões conforme materiais institucionais.</span></article>
                  <article><strong>3</strong><span>idiomas disponíveis no ecossistema digital.</span></article>
                  <article><strong>1</strong><span>jornada acompanhada pelo seu distribuidor.</span></article>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={styles.slide}>
              <span className={styles.kicker}>02 • ECOSSISTEMA DE PRODUTOS</span>
              <h2>Tecnologias que despertam <em>curiosidade e novas conversas.</em></h2>
              <p>Conheça as características, cuidados e versões atuais de cada produto antes de apresentar ou decidir.</p>
              <div className={styles.productGrid}>
                {products.map(([name, image]) => <article key={name}><Image src={image} alt={`Produto Prife ${name}`} width={360} height={360} loading="lazy" unoptimized /><strong>{name}</strong></article>)}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={styles.slide}>
              <span className={styles.kicker}>03 • COMO FUNCIONA</span>
              <h2>Uma atividade independente construída com <em>clareza e consistência.</em></h2>
              <div className={styles.journey}>
                <article><b>01</b><div><strong>Conhecer</strong><span>Entenda os produtos, as regras e os documentos atuais.</span></div></article>
                <article><b>02</b><div><strong>Compartilhar</strong><span>Apresente soluções com responsabilidade e sem promessas.</span></div></article>
                <article><b>03</b><div><strong>Acompanhar</strong><span>Organize contatos, conversas e próximos passos.</span></div></article>
                <article><b>04</b><div><strong>Desenvolver</strong><span>Aprenda continuamente com treinamentos e suporte.</span></div></article>
              </div>
              <p className={styles.notice}>Não existe renda ou resultado garantido. O desempenho depende de vendas, atividade, custos e regras vigentes.</p>
            </div>
          )}

          {step === 4 && (
            <div className={styles.slide}>
              <span className={styles.kicker}>04 • ESTRUTURA DIGITAL</span>
              <h2>Ferramentas para transformar contatos em uma <em>jornada organizada.</em></h2>
              <div className={styles.tools}>
                <article><span>⌕</span><strong>Prospector</strong><p>Encontre empresas por região e segmento para iniciar novas conversas B2B.</p></article>
                <article><span>◇</span><strong>CRM</strong><p>Organize cada lead desde o primeiro contato até a decisão.</p></article>
                <article><span>◎</span><strong>PontoVivo 3D</strong><p>Explore regiões e visualize oportunidades de forma interativa.</p></article>
                <article><span>◉</span><strong>Sala ao vivo</strong><p>Realize apresentações, treinamentos e reuniões online.</p></article>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className={styles.slide}>
              <span className={styles.kicker}>05 • SIMULAÇÃO PERSONALIZADA</span>
              <h2>Explore cenários com valores <em>definidos por você.</em></h2>
              <div className={styles.calculator}>
                <div className={styles.fields}>
                  <label>Valor médio por venda (R$)<input type="number" min="0" value={saleBrl} onChange={(event) => setSaleBrl(Number(event.target.value))} /></label>
                  <label>Comissão (%)<input type="number" min="0" max="100" value={commission} onChange={(event) => setCommission(Number(event.target.value))} /></label>
                  <label>Vendas por mês<input type="number" min="0" value={sales} onChange={(event) => setSales(Number(event.target.value))} /></label>
                  <label>Meses<select value={months} onChange={(event) => setMonths(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option key={value}>{value}</option>)}</select></label>
                </div>
                <div className={styles.result}>
                  <span>Comissão mensal estimada</span><strong>{money.format(projection.monthlyCommission)}</strong>
                  <small>Volume mensal: {money.format(projection.monthlyVolume)}</small>
                  <hr />
                  <span>Projeção em {months} {months === 1 ? "mês" : "meses"}</span><b>{money.format(projection.total)}</b>
                </div>
              </div>
              <p className={styles.notice}>Valores em Real brasileiro (BRL). Resultados reais podem variar e não são garantidos.</p>
            </div>
          )}

          {step === 6 && (
            <div className={`${styles.slide} ${styles.finalSlide}`}>
              <span className={styles.kicker}>06 • SEU PRÓXIMO PASSO</span>
              <h2>Quer descobrir se esta oportunidade <em>combina com você?</em></h2>
              <p>Converse com {ownerName}, tire suas dúvidas e solicite os documentos, custos e regras atuais antes de tomar qualquer decisão.</p>
              <div className={styles.finalActions}>
                <a className={styles.primary} href={whatsappHref} target="_blank" rel="noreferrer">Falar pelo WhatsApp <span>↗</span></a>
              </div>
              <small>Atendimento direto • Sem compromisso • Informação responsável</small>
            </div>
          )}
        </section>
      </div>

      <footer className={styles.controls}>
        <button onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>← Anterior</button>
        <span>{step + 1} / {steps.length}</span>
        <button onClick={() => setStep((value) => Math.min(lastStep, value + 1))} disabled={step === lastStep}>Próximo →</button>
      </footer>
    </main>
  );
}

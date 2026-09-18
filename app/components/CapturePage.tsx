import Image from "next/image";
import Link from "next/link";

import TrackedWhatsAppLink from "./TrackedWhatsAppLink";
import styles from "./CapturePage.module.css";

type CaptureVariant = "product" | "opportunity";

type CapturePageProps = {
  variant: CaptureVariant;
  ownerName: string;
  whatsappNumber: string;
  leaderImage: string;
};

const content = {
  product: {
    label: "TECNOLOGIA DE BEM-ESTAR",
    title: <>Conheça o <em>iTeraCare Classic Plus</em> com informação clara e atendimento direto.</>,
    lead: "Veja as características, os modelos, o modo de uso e os cuidados importantes antes de decidir se esta tecnologia combina com a sua rotina.",
    cta: "Falar sobre o iTeraCare no WhatsApp",
    message: "Conheci a página do iTeraCare e quero receber uma apresentação dos modelos, características e condições atuais.",
    mediaLabel: "iTeraCare Classic Plus",
    image: "/products/current/iteracare-classic-plus.webp",
    imageAlt: "iTeraCare Classic Plus",
    sectionTitle: <>Uma decisão consciente começa com <em>informação correta.</em></>,
    sectionIntro: "O atendimento apresenta o produto sem promessas médicas e ajuda você a verificar modelo, tensão, garantia, procedência e disponibilidade no seu país.",
    points: [
      ["Entenda o produto", "Conheça o aparelho, as versões disponíveis e a proposta de uso externo voltada ao bem-estar."],
      ["Confirme os cuidados", "Consulte o manual, as orientações do fabricante e as informações de segurança antes do uso."],
      ["Compare as condições", "Verifique preço vigente, estoque, frete, garantia e formas de pagamento diretamente com o distribuidor."],
    ],
    faqTitle: <>Dúvidas antes de <em>conhecer o produto?</em></>,
    faqs: [
      ["O iTeraCare substitui acompanhamento médico?", "Não. As tecnologias apresentadas são voltadas ao bem-estar e não substituem diagnóstico, prescrição ou acompanhamento de profissionais de saúde."],
      ["Como saber qual modelo é adequado?", "O distribuidor pode comparar modelos, tensão, acessórios e finalidade de uso informada, sem indicar tratamento de saúde."],
      ["Quanto custa?", "Preços, estoque, frete e condições podem mudar. O atendimento confirma os valores atuais antes de qualquer decisão."],
    ],
    finalTitle: <>Quer conhecer o iTeraCare com <em>transparência?</em></>,
    finalText: "Converse diretamente com o distribuidor responsável e receba uma apresentação sem obrigação de compra.",
    disclaimer: "Tecnologias de bem-estar não substituem diagnóstico, prescrição ou acompanhamento profissional. Resultados e experiências individuais podem variar.",
  },
  opportunity: {
    label: "OPORTUNIDADE INDEPENDENTE",
    title: <>Conheça a <em>oportunidade Prife</em> antes de decidir como começar.</>,
    lead: "Entenda o modelo independente, as atividades, os custos, as regras de remuneração e o suporte disponível — sem promessa de renda ou resultado garantido.",
    cta: "Entender a oportunidade no WhatsApp",
    message: "Conheci a página da oportunidade Prife e quero entender como funciona, quais são os requisitos, os custos e o suporte para começar.",
    mediaLabel: "Apresentação individual da oportunidade",
    image: null,
    imageAlt: "",
    sectionTitle: <>Avalie a oportunidade com <em>clareza e responsabilidade.</em></>,
    sectionIntro: "Antes do cadastro, você deve conhecer as atividades esperadas, os documentos atuais e as regras do plano. O objetivo é permitir uma decisão informada, sem pressão.",
    points: [
      ["Conheça o modelo", "Entenda como funcionam a atuação independente, a venda de produtos e o desenvolvimento da equipe."],
      ["Verifique os requisitos", "Confirme investimento, custos recorrentes, cancelamento, qualificações e regras vigentes por escrito."],
      ["Entenda o suporte", "Conheça os treinamentos, materiais e recursos disponíveis para acompanhar cada etapa da jornada."],
    ],
    faqTitle: <>Perguntas importantes antes de <em>começar.</em></>,
    faqs: [
      ["Preciso ter experiência em vendas?", "Experiência pode ajudar, mas não substitui o estudo do produto, das regras e das atividades. Confirme o treinamento e o suporte disponíveis."],
      ["Qual é o investimento para começar?", "Valores e condições podem mudar. Solicite ao distribuidor os documentos e custos atuais antes do cadastro."],
      ["Em quanto tempo terei resultado?", "Não existe prazo nem renda garantida. Resultados dependem de vendas, atividade, custos, regras do plano e desempenho individual."],
    ],
    finalTitle: <>Pronto para entender se esta oportunidade <em>faz sentido para você?</em></>,
    finalText: "Receba uma apresentação individual e tire suas dúvidas sobre regras, custos, suporte e próximos passos.",
    disclaimer: "Esta página não promete renda, retorno financeiro ou resultado. A oportunidade é independente e os resultados variam conforme vendas, atividade, custos e regras vigentes.",
  },
} as const;

function whatsappUrl(number: string, ownerName: string, message: string) {
  const firstName = ownerName.split(/\s+/)[0] || "distribuidor";
  return `https://wa.me/${number}?text=${encodeURIComponent(`Olá, ${firstName}! ${message}`)}`;
}

export default function CapturePage({ variant, ownerName, whatsappNumber, leaderImage }: CapturePageProps) {
  const copy = content[variant];
  const intent = variant === "product" ? "products" : "opportunity";
  const href = whatsappUrl(whatsappNumber, ownerName, copy.message);
  const image = copy.image || leaderImage;
  const imageAlt = copy.imageAlt || ownerName;
  const imageSize = variant === "product" ? { width: 941, height: 1672 } : { width: 1100, height: 1102 };

  return (
    <main className={styles.page} data-variant={variant}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Image src="/brand/prife-brasil-original.png" alt="Prife Brasil" width={138} height={58} priority />
          <span>Apresentação de {ownerName}</span>
        </header>

        <section className={styles.hero}>
          <div>
            <span className={styles.kicker}>{copy.label}</span>
            <h1>{copy.title}</h1>
            <p className={styles.lead}>{copy.lead} Atendimento apresentado por <strong>{ownerName}</strong>.</p>
            {variant === "opportunity" && <Link className={styles.presentationCta} href="/apresentacao">Ver apresentação interativa <span aria-hidden="true">→</span></Link>}
            <TrackedWhatsAppLink className={`${styles.cta} ${variant === "opportunity" ? styles.secondaryCta : ""}`} href={href} intent={intent} location={`capture_${variant}_hero`}>
              {copy.cta} <span aria-hidden="true">→</span>
            </TrackedWhatsAppLink>
            <small className={styles.microcopy}>Atendimento direto • Sem compromisso • Informação responsável</small>
          </div>

          <div className={styles.heroMedia}>
            <Image
              src={image}
              alt={imageAlt}
              width={imageSize.width}
              height={imageSize.height}
              priority
              sizes="(max-width: 860px) 86vw, 430px"
              unoptimized
            />
            <div className={styles.mediaLabel}>
              <span>PRIFE BRASIL</span>
              <strong>{copy.mediaLabel}</strong>
            </div>
          </div>
        </section>

        <section className={styles.proof} aria-label="Informações verificáveis">
          <article><strong>80+</strong><span>países e regiões conforme materiais institucionais fornecidos.</span></article>
          <article><strong>PWG</strong><span>Prife Wellness Gallery com espaço físico em Cacoal, Rondônia.</span></article>
          <article><strong>3 idiomas</strong><span>Conteúdo e orientação disponíveis em português, espanhol e inglês.</span></article>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionGrid}>
            <div><span className={styles.kicker}>COMO AVALIAR</span><h2>{copy.sectionTitle}</h2></div>
            <div className={styles.body}>
              <p>{copy.sectionIntro}</p>
              {copy.points.map(([title, description]) => <article key={title}><strong>{title}</strong><span>{description}</span></article>)}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <span className={styles.kicker}>PERGUNTAS FREQUENTES</span>
          <h2>{copy.faqTitle}</h2>
          <div className={styles.faq}>
            {copy.faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
          </div>
        </section>
      </div>

      <section className={styles.final}>
        <div className={styles.shell}>
          <span className={styles.kicker}>PRÓXIMO PASSO</span>
          <h2>{copy.finalTitle}</h2>
          <p>{copy.finalText}</p>
          <TrackedWhatsAppLink className={styles.cta} href={href} intent={intent} location={`capture_${variant}_final`}>
            {copy.cta} <span aria-hidden="true">→</span>
          </TrackedWhatsAppLink>
          <p className={styles.disclaimer}>{copy.disclaimer}</p>
        </div>
      </section>

      <footer className={`${styles.footer} ${styles.shell}`}>
        <span>© 2026 Prife Brasil • Distribuidor independente</span>
        <a href="/privacidade">Política de Privacidade</a>
      </footer>
    </main>
  );
}

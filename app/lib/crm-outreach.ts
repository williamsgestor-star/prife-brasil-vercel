export type CoachMode = "first" | "followup" | "objection" | "closing";
export type Offer = string;
type Language = "pt" | "es" | "en";
type Contact = { company_name: string; segment: string | null; notes?: string | null };
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const outreachOffers = [
  ["iteracare-classic-plus", "iTeraCare Classic Plus"],
  ["vitality-energy", "Vitality Energy"],
  ["envy-sun", "Envy Sun"],
  ["itera-bio-lite", "iTera-Bio Lite"],
  ["renew-patch", "Renew Patch"],
  ["envy-specs", "Envy Specs"],
  ["magnoseek", "MagnoSeek"],
  ["ion-shield", "iON Shield"],
  ["distribution", "Programa de Distribuição PRIFE"],
] as const;

const offerNames = Object.fromEntries(outreachOffers) as Record<string, string>;

function isRequestedAnswer(detail: string) {
  return /\b(me perguntou|perguntou sobre|o que (eu )?(falo|respondo)|como (eu )?respondo|quer saber|tem uma duvida|me pregunto|que (le )?respondo|como respondo|asked me|what (should|do) i (say|answer)|how (should|do) i answer|wants to know)\b/.test(detail);
}

function requestedAnswer(language: Language, selected: string, product: string, isDistribution: boolean) {
  if (isDistribution) {
    return {
      pt: "Olá! O Programa de Distribuição PRIFE é uma oportunidade comercial independente. Antes do cadastro, posso explicar as atividades, os custos, as responsabilidades e as regras oficiais de remuneração, sem prometer renda garantida. Qual desses pontos você quer conhecer primeiro?",
      es: "¡Hola! El Programa de Distribución PRIFE es una oportunidad comercial independiente. Antes del registro, puedo explicar las actividades, los costos, las responsabilidades y las reglas oficiales de remuneración, sin prometer ingresos garantizados. ¿Qué punto quieres conocer primero?",
      en: "Hello! The PRIFE Distribution Program is an independent business opportunity. Before registration, I can explain the activities, costs, responsibilities, and official compensation rules, without promising guaranteed income. Which point would you like to review first?",
    }[language];
  }

  const description = selected === "iteracare-classic-plus"
    ? {
        pt: "é um aparelho de bem-estar para uso externo que, conforme os materiais oficiais da PRIFE, combina fluxo de ar aquecido, tecnologia terahertz e quartzo óptico",
        es: "es un dispositivo de bienestar para uso externo que, según los materiales oficiales de PRIFE, combina flujo de aire caliente, tecnología de terahercios y cuarzo óptico",
        en: "is an external-use wellness device that, according to PRIFE's official materials, combines heated airflow, terahertz technology, and optical quartz",
      }[language]
    : selected === "itera-bio-lite"
      ? {
          pt: "é uma plataforma de bem-estar para os pés com níveis ajustáveis de intensidade, desenvolvida para uso externo",
          es: "es una plataforma de bienestar para los pies con niveles ajustables de intensidad, diseñada para uso externo",
          en: "is an external-use foot wellness platform with adjustable intensity levels",
        }[language]
      : selected === "ion-shield"
        ? {
            pt: "é um ionizador de ar pessoal da linha PRIFE, apresentado para uso cotidiano de bem-estar",
            es: "es un ionizador de aire personal de la línea PRIFE, presentado para el bienestar cotidiano",
            en: "is a personal air ionizer from the PRIFE range, presented for everyday wellness use",
          }[language]
        : {
            pt: "é um produto da linha de bem-estar PRIFE",
            es: "es un producto de la línea de bienestar PRIFE",
            en: "is a product in PRIFE's wellness range",
          }[language];

  return {
    pt: `Olá! O ${product} ${description}. Ele não é equipamento médico e não substitui avaliação ou tratamento. Posso enviar uma apresentação oficial com funcionamento, cuidados de uso, modelos e condições de compra. Qual dessas informações você quer ver primeiro?`,
    es: `¡Hola! ${product} ${description}. No es un dispositivo médico ni sustituye una evaluación o tratamiento. Puedo enviar una presentación oficial con su funcionamiento, precauciones, modelos y condiciones de compra. ¿Qué información quieres ver primero?`,
    en: `Hello! ${product} ${description}. It is not a medical device and does not replace professional assessment or treatment. I can send the official presentation covering how it works, precautions, models, and purchase terms. Which information would you like first?`,
  }[language];
}

export function createOutreach(language: Language, mode: CoachMode, lead: Contact | undefined, context: string, sender: string, offer: Offer = "auto") {
  // Operator instructions are never quoted as though the prospect said them.
  const detail = normalize(context);
  const selected = offer.trim() && offer !== "auto" ? offer.trim()
    : /vitality/.test(detail) ? "vitality-energy"
    : /envy.?sun/.test(detail) ? "envy-sun"
    : /bio.?lite/.test(detail) ? "itera-bio-lite"
    : /renew.?patch/.test(detail) ? "renew-patch"
    : /envy.?spec/.test(detail) ? "envy-specs"
    : /magno.?seek/.test(detail) ? "magnoseek"
    : /ion.?shield/.test(detail) ? "ion-shield"
    : /distribui|distribuc|distribution|revend|renda|negocio|business/.test(detail) ? "distribution"
    : "iteracare-classic-plus";
  const isDistribution = selected === "distribution" || /programa.*distribui|distribution program/.test(normalize(selected));
  const product = offerNames[selected] || selected.slice(0, 80);
  const pet = /pet\s?shop|veterin|animal/.test(normalize(`${lead?.segment || ""} ${lead?.company_name || ""}`));
  const wellness = /estetic|spa|wellness|beleza|beauty|fisioter|physio/.test(normalize(lead?.segment || ""));
  const objection = /nao.*(contat|mensag)|no.*(contact|mensaje)|stop|unsubscribe|nao.*interess|not interested|no.*interesa/.test(detail) ? "stop"
    : /caro|preco|valor|custo|presupuest|precio|expensive|price|budget/.test(detail) ? "price"
    : /tempo|ocupad|tiempo|busy|time/.test(detail) ? "time"
    : /pensar|depois|luego|think|later/.test(detail) ? "later"
    : /funciona|prova|evidenc|cura|doenca|work|proof|disease/.test(detail) ? "evidence" : "other";
  const short = /curt|breve|short/.test(detail);
  const answerRequested = isRequestedAnswer(detail);
  const who = sender.trim() || ({ pt: "[seu nome]", es: "[tu nombre]", en: "[your name]" }[language]);
  const company = lead?.company_name.trim();
  const copy = {
    pt: {
      hello: company ? `Olá, equipe da ${company}!` : "Olá! Tudo bem?",
      intro: `Sou ${who} e trabalho com a linha PRIFE.`,
      purpose: isDistribution ? "Gostaria de apresentar o programa de distribuição da PRIFE, explicar como funciona a atividade e quais são os custos e responsabilidades." : `Meu contato é para apresentar o ${product} e conversar sobre uma possível compra para uso pessoal.`,
      fit: pet ? "Estou buscando falar com o responsável pelo negócio; a proposta é de autocuidado pessoal, não de aplicação em animais." : wellness ? "Como o segmento de vocês é ligado ao bem-estar, gostaria de entender se existe interesse em conhecer a linha, sem presumir indicação para seus clientes." : "Quero entender se essa proposta faz sentido para vocês antes de enviar mais informações.",
      first: "Posso enviar uma apresentação breve para o responsável avaliar?",
      followup: `Sobre o ${product}, posso organizar as informações sobre funcionamento, cuidados de uso e condições de compra. Qual desses pontos você quer esclarecer primeiro?`,
      distributionFollowup: "Sobre a distribuição PRIFE, posso detalhar os custos, as atividades e as regras de remuneração. Qual desses pontos você quer avaliar primeiro?",
      closing: isDistribution ? "Podemos revisar os custos e as regras do programa antes de qualquer cadastro. Prefere receber o material ou agendar uma conversa breve?" : `Se você quiser avançar com o ${product}, posso confirmar o modelo, o valor total e as condições disponíveis antes do pedido. Posso preparar essas informações para sua avaliação?`,
      objections: {
        price: `Entendo que o investimento pesa na decisão. Antes de decidir sobre o ${product}, vale conferir o que está incluído e as condições reais da proposta. O que pesa mais hoje: o valor total ou a forma de pagamento?`,
        time: "Entendo, não quero atrapalhar sua rotina. Posso deixar um resumo curto para você consultar quando puder?",
        later: "Claro, você pode avaliar com calma. Existe alguma dúvida que eu possa esclarecer agora ou prefere combinar uma data para retomar?",
        evidence: `É uma dúvida importante. Posso compartilhar a documentação disponível do ${product} e explicar suas limitações, sem prometer cura ou resultados. Qual informação você gostaria de verificar?`,
        stop: "Entendido, obrigado por avisar. Não vou insistir nem enviar novas ofertas. Se você quiser retomar no futuro, fico à disposição.",
        other: `Obrigado por explicar sua dúvida sobre o ${product}. Para responder com precisão, você consegue me dizer qual ponto precisa esclarecer?`,
      },
      tip: pet ? "Pet shop: confirme quem decide e se há interesse pessoal. Não proponha uso veterinário nem invente benefícios para animais." : isDistribution ? "Apresente custos, responsabilidades e regras oficiais. Não prometa renda ou retorno garantido." : "Após a resposta, confirme o interesse e envie apenas o material solicitado. Não invente preço, desconto, certificação ou resultado clínico.",
      limits: "Sugestão por regras, sem API de IA. Reconhece produto, intenção, pedidos de texto curto e objeções comuns; instruções livres exigem revisão. As anotações do CRM não são tratadas como falas do cliente.",
      stopTip: "Encerre a prospecção desse contato. Não programe novas mensagens comerciais.",
    },
    es: {
      hello: company ? `¡Hola, equipo de ${company}!` : "¡Hola! ¿Cómo estás?",
      intro: `Soy ${who} y trabajo con la línea PRIFE.`,
      purpose: isDistribution ? "Quisiera presentar el programa de distribución PRIFE, sus actividades, costos y responsabilidades." : `Te contacto para presentar ${product} y conversar sobre una posible compra para uso personal.`,
      fit: pet ? "Busco hablar con la persona responsable del negocio; la propuesta es de autocuidado personal, no de uso en animales." : wellness ? "Como su sector está relacionado con el bienestar, quisiera saber si les interesa conocer la línea, sin presumir indicaciones para sus clientes." : "Quisiera saber si la propuesta les interesa antes de enviar más información.",
      first: "¿Puedo enviar una presentación breve para que la persona responsable la evalúe?",
      followup: `Sobre ${product}, puedo resumir su funcionamiento, precauciones y condiciones de compra. ¿Qué punto quieres aclarar primero?`,
      distributionFollowup: "Sobre la distribución PRIFE, puedo explicar costos, actividades y reglas de remuneración. ¿Qué punto quieres evaluar primero?",
      closing: isDistribution ? "Podemos revisar los costos y las reglas antes del registro. ¿Prefieres recibir el material o agendar una conversación breve?" : `Si quieres avanzar con ${product}, puedo confirmar el modelo, el precio total y las condiciones antes del pedido. ¿Preparo esa información para tu evaluación?`,
      objections: {
        price: `Entiendo que la inversión importa. Antes de decidir sobre ${product}, conviene revisar qué incluye la propuesta y sus condiciones reales. ¿Te preocupa más el precio total o la forma de pago?`,
        time: "Entiendo, no quiero interrumpir tu rutina. ¿Puedo dejar un resumen corto para que lo consultes cuando puedas?",
        later: "Claro, puedes evaluar con calma. ¿Hay alguna duda que pueda aclarar o prefieres acordar una fecha para retomar?",
        evidence: `Es una duda importante. Puedo compartir la documentación disponible de ${product} y sus limitaciones, sin prometer curas ni resultados. ¿Qué información quieres verificar?`,
        stop: "Entendido, gracias por avisar. No insistiré ni enviaré nuevas ofertas. Si quieres retomar en el futuro, quedo a disposición.",
        other: `Gracias por plantear tu duda sobre ${product}. ¿Qué punto necesitas aclarar para poder responderte con precisión?`,
      },
      tip: pet ? "Confirma quién decide y si existe interés personal. No propongas uso veterinario ni inventes beneficios para animales." : isDistribution ? "Presenta costos, responsabilidades y reglas oficiales. No prometas ingresos garantizados." : "Confirma el interés y envía solo el material solicitado. No inventes precios, descuentos, certificaciones o resultados clínicos.",
      limits: "Sugerencias por reglas, sin API de IA. Reconoce productos, intención, textos breves y objeciones comunes; revisa las instrucciones libres. Las notas del CRM no se consideran palabras del cliente.",
      stopTip: "Finaliza la prospección de este contacto. No programes nuevos mensajes comerciales.",
    },
    en: {
      hello: company ? `Hello, ${company} team!` : "Hello!",
      intro: `I'm ${who} and I work with the PRIFE range.`,
      purpose: isDistribution ? "I'd like to introduce PRIFE's distribution program, including the work involved, costs and responsibilities." : `I'm reaching out to introduce ${product} and discuss a possible purchase for personal use.`,
      fit: pet ? "I'm looking to reach the business owner about personal self-care, not use on animals." : wellness ? "Since your sector relates to wellness, I'd like to know whether you are interested in the range, without assuming it is suitable for your clients." : "I'd like to check whether this interests you before sending more information.",
      first: "May I send a short introduction for the person in charge to review?",
      followup: `Regarding ${product}, I can summarize how it works, precautions and purchase terms. Which point would you like to clarify first?`,
      distributionFollowup: "Regarding PRIFE distribution, I can explain costs, activities and compensation rules. Which point would you like to review first?",
      closing: isDistribution ? "We can review costs and program rules before any registration. Would you prefer the information or a brief conversation?" : `If you'd like to move forward with ${product}, I can confirm the model, total price and available terms before an order. May I prepare those details for your review?`,
      objections: {
        price: `I understand the investment matters. Before deciding on ${product}, it helps to check what is included and the actual terms. Is your main concern the total price or payment method?`,
        time: "Understood, I don't want to interrupt your day. May I leave a short summary for you to read when convenient?",
        later: "Of course, take your time. Is there a question I can clarify, or would you prefer to agree on a date to reconnect?",
        evidence: `That is an important question. I can share the available documentation for ${product} and explain its limitations without promising cures or results. What would you like to verify?`,
        stop: "Understood, thank you for letting me know. I won't send further offers. If you want to reconnect in future, I'm available.",
        other: `Thank you for raising your question about ${product}. Which specific point should I clarify so I can answer accurately?`,
      },
      tip: pet ? "Check who makes decisions and whether there is personal interest. Do not suggest veterinary use or invent animal benefits." : isDistribution ? "Explain costs, responsibilities and official rules. Do not promise guaranteed earnings." : "Confirm interest and send only the requested material. Do not invent prices, discounts, certifications or clinical outcomes.",
      limits: "Rule-based suggestions, without an AI API. Recognizes products, intent, short-message requests and common objections; review free-form instructions. CRM notes are not treated as the customer's words.",
      stopTip: "End outreach to this contact. Do not schedule further sales messages.",
    },
  }[language];
  const message = objection === "stop" ? copy.objections.stop
    : answerRequested ? requestedAnswer(language, selected, product, isDistribution)
    : mode === "first" ? [copy.hello, copy.intro, copy.purpose, short ? "" : copy.fit, copy.first].filter(Boolean).join("\n\n")
    : mode === "objection" ? copy.objections[objection]
    : mode === "followup" ? `${copy.hello}\n\n${isDistribution ? copy.distributionFollowup : copy.followup}`
    : `${copy.hello}\n\n${copy.closing}`;
  return { message, tip: objection === "stop" ? copy.stopTip : copy.tip, limits: copy.limits, product };
}

import type { SiteLanguage } from "./site-language";
import { materialKnowledgeReply } from "./itera-knowledge";

export type IteraContext =
  | "prife"
  | "business"
  | "sales"
  | "catalog"
  | "iteracare"
  | "iterabio"
  | "biolite"
  | "ionshield"
  | "magnoseek"
  | "glasses"
  | "bracelet"
  | "renew"
  | "oxytap"
  | "other-product"
  | "pwg"
  | "travel"
  | "foundation";

export type IteraExpertReply = {
  text: string;
  showWhatsApp?: boolean;
  focusQuestion?: boolean;
  context?: IteraContext;
};

function translated(language: SiteLanguage, pt: string, es: string, en: string) {
  return { pt, es, en }[language];
}

const SALES_APPROACH_TERMS = /\b(abordagem|abordar|como abordar|cliente novo|novo cliente|futuro cliente|primeiro contato|mensagem para cliente|mensagem de venda|roteiro de venda|script de venda|prospeccao|prospectar|como vender|ajuda para vender|apresentar (o )?produto|vender para|enfoque de venta|abordar cliente|cliente nuevo|primer contacto|mensaje para cliente|guion de venta|como vender|sales approach|approach a client|new client|new customer|first contact|sales message|sales script|how to sell|pitch)\b/;
const SALES_OBJECTION_TERMS = /\b(quebra de objecao|quebrar objecao|contornar objecao|responder objecao|cliente (disse|falou|respondeu|acha|achou)|manejo de objeciones|responder objecion|cliente dijo|handle objection|objection handling|customer said|client said)\b/;

function productApproach(context: IteraContext | null, language: SiteLanguage) {
  const approaches: Partial<Record<IteraContext, Record<SiteLanguage, string>>> = {
    iteracare: {
      pt: "Olá, [nome]! Estou apresentando o iTeraCare, uma tecnologia externa de bem-estar que combina calor e terahertz. Antes de explicar modelos, queria entender: você busca algo para uso pessoal, familiar ou profissional? Se fizer sentido, posso te mostrar o funcionamento e os cuidados em uma demonstração sem compromisso.",
      es: "¡Hola, [nombre]! Estoy presentando iTeraCare, una tecnología externa de bienestar que combina calor y terahercios. Antes de hablar de modelos, quisiera entender: ¿lo buscas para uso personal, familiar o profesional? Si te parece útil, puedo mostrarte cómo funciona y sus cuidados en una demostración sin compromiso.",
      en: "Hi [name]! I’m introducing iTeraCare, an external wellness technology combining heat and terahertz. Before discussing models, may I ask whether you are considering personal, family, or professional use? If it makes sense, I can show you how it works and the key precautions in a no-pressure demonstration.",
    },
    biolite: {
      pt: "Olá, [nome]! Queria te apresentar o iTera-Bio Lite, uma plataforma para os pés voltada a relaxamento e bem-estar diário. Na sua rotina, você valoriza mais praticidade, momentos de relaxamento ou uma experiência tecnológica? Se tiver interesse, posso mostrar como funciona e os cuidados de uso, sem compromisso.",
      es: "¡Hola, [nombre]! Quisiera presentarte iTera-Bio Lite, una plataforma para los pies orientada a la relajación y el bienestar diario. En tu rutina, ¿valoras más la practicidad, los momentos de relajación o una experiencia tecnológica? Si te interesa, puedo mostrarte cómo funciona y sus cuidados, sin compromiso.",
      en: "Hi [name]! I’d like to introduce iTera-Bio Lite, a foot platform designed for relaxation and everyday wellness. In your routine, do you value convenience, relaxation time, or a technology-focused experience most? If interested, I can show you how it works and explain the precautions, with no obligation.",
    },
    magnoseek: {
      pt: "Olá, [nome]! Você gosta de tecnologias que organizam informações de bem-estar de forma prática? Estou apresentando o MagnoSeek, uma experiência informativa e não invasiva que combina análise de dados e IA. Posso te mostrar uma demonstração e explicar claramente o que ele faz — e também o que ele não substitui. Quer conhecer?",
      es: "¡Hola, [nombre]! ¿Te interesan las tecnologías que organizan información de bienestar de forma práctica? Estoy presentando MagnoSeek, una experiencia informativa y no invasiva que combina análisis de datos e IA. Puedo mostrarte una demostración y explicar claramente lo que hace y lo que no sustituye. ¿Te gustaría conocerlo?",
      en: "Hi [name]! Are you interested in technologies that organize wellness information in a practical way? I’m introducing MagnoSeek, a non-invasive informational experience combining data analysis and AI. I can demonstrate it and clearly explain what it does—and what it does not replace. Would you like to see it?",
    },
    glasses: {
      pt: "Olá, [nome]! Estou apresentando a linha de óculos PRIFE, com opções solares e de uso diário que unem design e conforto visual. Para indicar a opção certa, você procura óculos para sol, para a rotina em frente às telas ou principalmente pelo estilo? Posso te enviar os modelos disponíveis sem compromisso.",
      es: "¡Hola, [nombre]! Estoy presentando la línea de gafas PRIFE, con opciones de sol y uso diario que combinan diseño y comodidad visual. Para mostrarte la opción adecuada, ¿buscas gafas de sol, para tu rutina frente a pantallas o principalmente por estilo? Puedo enviarte los modelos disponibles sin compromiso.",
      en: "Hi [name]! I’m introducing PRIFE eyewear, with sunglasses and everyday options combining design and visual comfort. To show you the right option, are you looking for sunwear, something for your screen-time routine, or mainly style? I can send the available models with no obligation.",
    },
    bracelet: {
      pt: "Olá, [nome]! Estou apresentando a Vitality Energy, uma pulseira de uso diário que combina design, praticidade e a proposta de bem-estar da PRIFE. Você costuma usar acessórios e prefere uma opção discreta ou mais marcante? Posso te mostrar as cores e explicar os materiais sem compromisso.",
      es: "¡Hola, [nombre]! Estoy presentando Vitality Energy, una pulsera de uso diario que combina diseño, practicidad y la propuesta de bienestar de PRIFE. ¿Sueles usar accesorios y prefieres algo discreto o más llamativo? Puedo mostrarte los colores y explicar los materiales sin compromiso.",
      en: "Hi [name]! I’m introducing Vitality Energy, an everyday bracelet combining design, convenience, and PRIFE’s wellness positioning. Do you usually wear accessories, and do you prefer something subtle or more noticeable? I can show you the colors and explain the materials with no obligation.",
    },
    renew: {
      pt: "Olá, [nome]! Estou apresentando o Renew Patch, um patch não transdérmico da linha de bem-estar PRIFE. Antes de te enviar informações, quero entender: você procura praticidade para a rotina ou quer conhecer a tecnologia e o modo de uso oficial? Posso explicar com transparência, sem prometer resultado de saúde.",
      es: "¡Hola, [nombre]! Estoy presentando Renew Patch, un parche no transdérmico de la línea de bienestar PRIFE. Antes de enviarte información, quisiera entender: ¿buscas practicidad para tu rutina o conocer la tecnología y el modo de uso oficial? Puedo explicarlo con transparencia, sin prometer resultados de salud.",
      en: "Hi [name]! I’m introducing Renew Patch, a non-transdermal patch in PRIFE’s wellness line. Before sending information, may I ask whether you value everyday convenience or want to understand the technology and official directions? I can explain it transparently without promising health outcomes.",
    },
    travel: {
      pt: "Olá, [nome]! Você costuma viajar ou gostaria de planejar férias com condições exclusivas para membros? A PRIFE apresenta o Private Travel Club como um benefício de assinatura para membros ativos, com portal de viagens, Escape Credits e certificados Dream Vacation. Posso te explicar o que está incluído, as regras e o passo a passo, sem tratar exemplos promocionais como garantia. O que mais interessa: economia, férias em família ou entender a assinatura?",
      es: "¡Hola, [nombre]! ¿Sueles viajar o te gustaría planificar vacaciones con condiciones exclusivas para miembros? PRIFE presenta Private Travel Club como un beneficio de suscripción para miembros activos, con portal de viajes, Escape Credits y certificados Dream Vacation. Puedo explicarte lo incluido, las reglas y el proceso sin presentar ejemplos promocionales como garantía. ¿Te interesa más el ahorro, las vacaciones familiares o la suscripción?",
      en: "Hi [name]! Do you travel regularly, or would you like to plan vacations with member-only travel options? PRIFE presents Private Travel Club as a membership benefit for active members, including a travel portal, Escape Credits, and Dream Vacation certificates. I can explain what is included, the rules, and the process without treating promotional examples as guarantees. Are you most interested in savings, family vacations, or how membership works?",
    },
  };

  return context ? approaches[context]?.[language] : undefined;
}

export function salesCoachReply(
  question: string,
  language: SiteLanguage = "pt",
  previousContext: IteraContext | null = null,
): IteraExpertReply | null {
  const input = normalizeIteraQuestion(question);
  const detectedContext = detectIteraContext(input);
  const context = detectedContext || previousContext;
  const asksForApproach = SALES_APPROACH_TERMS.test(input);
  const asksForObjectionHelp = SALES_OBJECTION_TERMS.test(input) || (
    previousContext === "sales" &&
    /\b(caro|preco|valor|sem dinheiro|vou pensar|nao conheco|nao acredito|funciona|medo|garantia|sem tempo|ja tenho|costoso|precio|sin dinero|voy a pensar|no conozco|no creo|miedo|sin tiempo|expensive|price|no money|think about it|do not know|do not believe|afraid|no time|already have)\b/.test(input)
  );
  const continuesSalesCoaching = previousContext === "sales" && (
    detectedContext !== null ||
    /\b(homem|mulher|jovem|adulto|idoso|anos|idade|familia|empresari[oa]|profissional|cliente|amigo|amiga|hombre|mujer|joven|adulto|mayor|anos|edad|familia|empresari[oa]|profesional|male|female|young|adult|senior|years old|age|family|business owner|professional|customer|friend)\b/.test(input)
  );

  if (!asksForApproach && !asksForObjectionHelp && !continuesSalesCoaching) return null;

  if (asksForObjectionHelp) {
    return {
      text: translated(language,
        "Para quebrar uma objeção sem pressionar, use 4 passos: 1) acolha: “Entendo seu ponto”; 2) investigue: “O que pesa mais para você: valor, confiança, necessidade ou momento?”; 3) responda somente ao motivo real, com fatos e sem promessas; 4) confirme: “Se esclarecermos isso, faria sentido conhecer melhor?” Exemplo para preço: “Entendo. Antes de falar de condição, posso mostrar o que está incluído, garantia e suporte para você avaliar se o valor faz sentido?” Diga a objeção exata do cliente e o produto para eu montar a resposta pronta.",
        "Para manejar una objeción sin presionar, usa 4 pasos: 1) acoge: “Entiendo tu punto”; 2) investiga: “¿Qué pesa más: precio, confianza, necesidad o momento?”; 3) responde solo al motivo real, con hechos y sin promesas; 4) confirma: “Si aclaramos esto, ¿tendría sentido conocerlo mejor?” Para precio: “Entiendo. Antes de hablar de condiciones, ¿puedo mostrarte qué incluye, la garantía y el soporte para que evalúes si el valor tiene sentido?” Dime la objeción exacta y el producto.",
        "To handle an objection without pressure, use four steps: 1) acknowledge: “I understand your point”; 2) investigate: “What matters most—price, trust, need, or timing?”; 3) answer only the real concern with facts and no promises; 4) confirm: “If we clarify that, would it make sense to learn more?” For price: “Before discussing terms, may I show you what is included, the warranty, and support so you can decide whether the value makes sense?” Tell me the exact objection and product.",
      ),
      context: "sales",
      focusQuestion: true,
    };
  }

  const tailored = productApproach(context, language);
  if (tailored) {
    return {
      text: translated(language,
        `Use esta abordagem pronta:\n\n“${tailored}”\n\nDepois, ouça a resposta e apresente somente o que combina com a necessidade citada. Termine com: “Você prefere receber um resumo ou ver uma demonstração?”`,
        `Usa este enfoque listo:\n\n“${tailored}”\n\nDespués, escucha la respuesta y presenta solo lo que corresponda a la necesidad mencionada. Termina con: “¿Prefieres recibir un resumen o ver una demostración?”`,
        `Use this ready-to-send approach:\n\n“${tailored}”\n\nThen listen and present only what matches the stated need. Close with: “Would you prefer a short summary or a demonstration?”`,
      ),
      context: "sales",
      focusQuestion: true,
    };
  }

  return {
    text: translated(language,
      "Claro. Para um cliente novo, use esta mensagem:\n\n“Olá, [nome]! Tudo bem? Estou apresentando algumas tecnologias de bem-estar da PRIFE e lembrei de você. Antes de indicar um produto, quero entender: você busca mais praticidade, relaxamento, conforto para a rotina ou quer conhecer uma tecnologia específica? Se fizer sentido, posso te mostrar opções e explicar sem compromisso.”\n\nDepois pergunte: “O que é mais importante para você hoje?” Ouça primeiro e só então apresente o produto. Diga qual produto e o perfil do cliente para eu personalizar a abordagem.",
      "Claro. Para un cliente nuevo, usa este mensaje:\n\n“¡Hola, [nombre]! Estoy presentando algunas tecnologías de bienestar de PRIFE y pensé en ti. Antes de recomendar un producto, quisiera entender: ¿buscas más practicidad, relajación, comodidad en tu rutina o conocer una tecnología específica? Si tiene sentido, puedo mostrarte opciones sin compromiso.”\n\nDespués pregunta: “¿Qué es lo más importante para ti hoy?” Escucha primero y presenta el producto después. Dime el producto y el perfil del cliente para personalizarlo.",
      "Of course. For a new customer, use this message:\n\n“Hi [name]! I’m introducing several PRIFE wellness technologies and thought of you. Before suggesting a product, may I ask whether you are looking for convenience, relaxation, everyday comfort, or a specific technology? If it makes sense, I can show you some options with no obligation.”\n\nThen ask: “What matters most to you right now?” Listen first and present the product afterward. Tell me the product and customer profile so I can personalize the approach.",
    ),
    context: "sales",
    focusQuestion: true,
  };
}

export function normalizeIteraQuestion(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectIteraContext(value: string): IteraContext | null {
  const input = normalizeIteraQuestion(value);
  if (/\b(prife travel club|private travel club|private travel|travel club|ptc|clube de viage(?:m|ns)|assinatura (?:da|de) viage(?:m|ns)|mensalidade (?:da|de) viage(?:m|ns)|escape credits?|lrp|dream vacation|ferias dos sonhos|portal de viagens|pontos? de registro|top up|reward credits?)\b/.test(input)) return "travel";
  if (/\b(prife foundation|foundation|fundacao prife|acao social|voluntariado|voluntario)\b/.test(input)) return "foundation";
  if (/\b(magnoseek|magno seek|biorressonancia|bioresonancia|bioresonance)\b/.test(input)) return "magnoseek";
  if (/\b(ion ?shield|pingente ionizador|ionizing pendant)\b/.test(input)) return "ionshield";
  if (/\b(itera bio lite|bio lite|plataforma para os pes|foot platform)\b/.test(input)) return "biolite";
  if (/\b(itera bio|itera-bio|massager de pes|foot massager)\b/.test(input)) return "iterabio";
  if (/\b(renew patch|renew|adesivo|parche)\b/.test(input)) return "renew";
  if (/\b(envy spec|envy-spec|envy sun|oculos|gafas|glasses|luz azul|blue light)\b/.test(input)) return "glasses";
  if (/\b(vitality|pulseira|pulsera|bracelet)\b/.test(input)) return "bracelet";
  if (/\b(oxytap|oxy tap)\b/.test(input)) return "oxytap";
  if (/\b(iteracare|itera care|itera classic|classic 2|premium plus|itera premium|itera pro|pro plus|terahertz|terahercio|tera hertz|soprador|varinha)\b/.test(input)) return "iteracare";
  if (/\b(pwg|prife wellness gallery|wellness gallery)\b/.test(input)) return "pwg";
  if (/\b(ionsleep|smart car oxygen|7wonders|7 wonders|nxgen|qfrequency|scalar energy|energia escalar|emf shield|hydra care|hydracare|cellfood|reborn stem|taka?ra patch|graphene energy|aurora optics|vision prife|luxe beau|skinora|arowave)\b/.test(input)) return "other-product";
  if (/\b(produtos?|productos?|products?|catalogo|catalog|linhas?|series)\b/.test(input)) return "catalog";
  if (/\b(negocio|oportunidade|plano de marketing|renda|ganhar dinheiro|ingreso|ganar dinero|business|opportunity|income|earn money)\b/.test(input)) return "business";
  if (/\b(prife|empresa|companhia|company)\b/.test(input)) return "prife";
  return null;
}

export function basicConversationReply(
  question: string,
  language: SiteLanguage = "pt",
): IteraExpertReply | null {
  const input = normalizeIteraQuestion(question);

  if (/^(oi|ola|bom dia|boa tarde|boa noite|e ai|hey|hello|hi|hola|buenos dias|buenas tardes|buenas noches)\b/.test(input)) {
    return {
      text: translated(language,
        "Olá! 👋 Eu sou o Assistente iTERA. Posso explicar a PRIFE, comparar produtos, falar sobre segurança e autenticidade, esclarecer a oportunidade de negócio ou orientar seu próximo passo. O que você quer descobrir primeiro?",
        "¡Hola! 👋 Soy el Asistente iTERA. Puedo explicar PRIFE, comparar productos, hablar sobre seguridad y autenticidad, aclarar la oportunidad de negocio u orientarte en el próximo paso. ¿Qué quieres descubrir primero?",
        "Hello! 👋 I’m the iTERA Assistant. I can explain PRIFE, compare products, cover safety and authenticity, clarify the business opportunity, or guide your next step. What would you like to discover first?",
      ),
    };
  }

  if (/\b(o que (voce|vc) sabe|o que sabe|sobre o que|como pode (me )?ajudar|no que pode (me )?ajudar|quais informacoes|qual sua funcao|o que faz|que sabes|en que puedes ayudar|what do you know|how can you help|what can you do)\b/.test(input)) {
    return {
      text: translated(language,
        "Sei explicar a PRIFE, seus produtos, o Prife Travel Club e a Prife Foundation. Também crio abordagens de venda, mensagens para clientes novos, follow-up e respostas para objeções, além de explicar segurança, autenticidade, compra, cadastro e plano de marketing. Não faço diagnóstico nem prometo resultados. Você quer começar por produto, abordagem comercial, viagens, ação social ou negócio?",
        "Puedo explicar PRIFE, sus productos, Prife Travel Club y Prife Foundation. También preparo enfoques de venta, mensajes para clientes nuevos, seguimiento y respuestas a objeciones, además de explicar seguridad, autenticidad, compra, registro y plan de marketing. No hago diagnósticos ni prometo resultados. ¿Quieres comenzar por productos, ventas, viajes, acción social o negocio?",
        "I can explain PRIFE, its products, Prife Travel Club, and Prife Foundation. I also create sales approaches, new-customer messages, follow-ups, and objection responses, and explain safety, authenticity, purchasing, registration, and the marketing plan. I do not diagnose or promise results. Would you like to start with products, sales, travel, social action, or the business?",
      ),
      context: "catalog",
    };
  }

  if (/\b(quem e voce|qual seu nome|eres quien|quien eres|who are you|your name)\b/.test(input)) {
    return {
      text: translated(language,
        "Sou o Assistente iTERA, o atendimento virtual deste site. Uso os materiais fornecidos pela PRIFE, o catálogo oficial e fontes complementares indicadas pelo distribuidor para responder de forma clara e responsável. Posso ajudar com produtos, negócio, cadastro ou dúvidas de compra.",
        "Soy el Asistente iTERA, la atención virtual de este sitio. Utilizo los materiales proporcionados por PRIFE, el catálogo oficial y fuentes complementarias indicadas por el distribuidor para responder con claridad y responsabilidad. Puedo ayudarte con productos, negocio, registro o compra.",
        "I’m the iTERA Assistant, this site’s virtual support. I use PRIFE-provided materials, the official catalog, and supplementary sources selected by the distributor to answer clearly and responsibly. I can help with products, the business, registration, or purchasing questions.",
      ),
    };
  }

  if (/^(obrigad[oa]|valeu|gracias|thanks|thank you)\b/.test(input)) {
    return {
      text: translated(language,
        "Por nada! 😊 Se quiser, posso comparar produtos, explicar a oportunidade ou ajudar você a preparar as perguntas certas antes de falar com um consultor.",
        "¡Con gusto! 😊 Si quieres, puedo comparar productos, explicar la oportunidad o ayudarte a preparar las preguntas correctas antes de hablar con un consultor.",
        "You’re welcome! 😊 I can compare products, explain the opportunity, or help you prepare the right questions before speaking with a consultant.",
      ),
    };
  }

  if (/\b(nao entendi|explique melhor|pode repetir|no entendi|explica mejor|i don t understand|explain again)\b/.test(input)) {
    return {
      text: translated(language,
        "Claro. Posso explicar de forma mais simples e por etapas. Diga apenas o assunto: PRIFE, iTeraCare, outro produto, segurança, compra ou oportunidade de negócio.",
        "Claro. Puedo explicarlo de forma más sencilla y por pasos. Dime el tema: PRIFE, iTeraCare, otro producto, seguridad, compra u oportunidad de negocio.",
        "Of course. I can explain it more simply and step by step. Just name the topic: PRIFE, iTeraCare, another product, safety, purchasing, or the business opportunity.",
      ),
      focusQuestion: true,
    };
  }

  return null;
}

export function expertiseReply(
  question: string,
  language: SiteLanguage = "pt",
  previousContext: IteraContext | null = null,
): IteraExpertReply | null {
  const input = normalizeIteraQuestion(question);
  const detectedContext = detectIteraContext(input);
  const context = detectedContext || previousContext;

  if (/\b(qual (e )?o melhor|qual escolher|qual combina|me recomenda|recomendacao|cual elegir|cual es mejor|recomienda|which one|which is best|recommend)\b/.test(input)) {
    return {
      text: translated(language,
        "O melhor depende do objetivo, frequência de uso, ambiente, orçamento e disponibilidade no seu país. Para uso pessoal, compare praticidade e garantia; para uso intenso ou profissional, confirme potência, durabilidade e suporte do modelo. Diga se busca uso pessoal, familiar ou profissional e eu ajudo a filtrar sem prometer resultado de saúde.",
        "La mejor opción depende del objetivo, la frecuencia de uso, el entorno, el presupuesto y la disponibilidad en tu país. Para uso personal, compara practicidad y garantía; para uso intenso o profesional, confirma potencia, durabilidad y soporte. Dime si buscas uso personal, familiar o profesional y te ayudo a filtrar.",
        "The best option depends on your goal, frequency of use, setting, budget, and country availability. For personal use, compare convenience and warranty; for intensive or professional use, confirm power, durability, and support. Tell me whether it is for personal, family, or professional use and I’ll help narrow it down.",
      ),
      context: context || "catalog",
      focusQuestion: true,
    };
  }

  if (/\b(diferenca|comparar|compare|modelos|classic.*premium|premium.*classic|classic.*pro|premium.*pro|diferencia|comparacion|difference|versus|\bvs\b)\b/.test(input) && (context === "iteracare" || /\b(classic|premium|pro)\b/.test(input))) {
    return {
      text: translated(language,
        "Em visão geral: Classic é a linha de entrada para uso pessoal; Premium e Premium Plus priorizam maior robustez para uso doméstico mais intenso; Pro e Pro Plus são linhas voltadas ao uso profissional. Recursos, potência, tensão e disponibilidade variam conforme modelo e país. Antes de comprar, confirme a ficha técnica e a garantia exatas do modelo oferecido.",
        "En general: Classic es la línea de entrada para uso personal; Premium y Premium Plus priorizan mayor robustez para uso doméstico más intenso; Pro y Pro Plus están orientados al uso profesional. Funciones, potencia, voltaje y disponibilidad varían según el modelo y el país. Confirma la ficha técnica y la garantía exactas antes de comprar.",
        "In broad terms, Classic is the entry line for personal use; Premium and Premium Plus prioritize added robustness for more intensive home use; Pro and Pro Plus are aimed at professional use. Features, power, voltage, and availability vary by model and country. Confirm the exact specification sheet and warranty before purchasing.",
      ),
      context: "iteracare",
    };
  }

  if (/\b(o que e|como funciona|para que serve|serve pra que|explique|what is|how does|what does|que es|como funciona|para que sirve)\b/.test(input) && /\b(terahertz|terahercio|tera hertz)\b/.test(input)) {
    return {
      text: translated(language,
        "Terahertz é uma faixa do espectro eletromagnético situada entre o infravermelho distante e as micro-ondas. Os materiais da PRIFE apresentam o iTeraCare como aparelho externo de bem-estar que combina terahertz, calor e quartzo óptico. Ele não é dispositivo médico e não deve ser usado para diagnosticar, tratar ou curar doenças. Quer conhecer os modelos ou os cuidados gerais?",
        "Terahercios es una franja del espectro electromagnético situada entre el infrarrojo lejano y las microondas. Los materiales de PRIFE presentan iTeraCare como un aparato externo de bienestar que combina terahercios, calor y cuarzo óptico. No es un dispositivo médico ni debe usarse para diagnosticar, tratar o curar enfermedades. ¿Quieres conocer los modelos o los cuidados generales?",
        "Terahertz is a band of the electromagnetic spectrum between far infrared and microwaves. PRIFE materials present iTeraCare as an external-use wellness appliance combining terahertz, heat, and optical quartz. It is not a medical device and should not be used to diagnose, treat, or cure disease. Would you like to compare models or review general precautions?",
      ),
      context: "iteracare",
    };
  }

  if (/\b(seguro|seguranca|cuidados|contraindicacao|quem nao pode|marcapasso|gravidez|safety|safe|precaution|pacemaker|pregnan|seguridad|precaucion|embaraz)\b/.test(input)) {
    return {
      text: translated(language,
        "Use somente conforme o manual do modelo: uso externo, aparelho seco, entradas de ar livres, sem impactos e com resfriamento antes de guardar. Pessoas com marca-passo ou implante eletrônico, gestantes, áreas com ferida aberta, sangramento ou sensibilidade reduzida ao calor devem buscar orientação profissional antes do uso. Em caso de desconforto, interrompa. Qual produto você está avaliando?",
        "Úsalo solo según el manual: uso externo, equipo seco, entradas de aire libres, sin golpes y dejando enfriar antes de guardarlo. Personas con marcapasos o implantes electrónicos, embarazadas, zonas con heridas, sangrado o sensibilidad reducida al calor deben consultar a un profesional antes de usarlo. Si hay molestias, interrumpe el uso. ¿Qué producto evalúas?",
        "Use only as directed in the model manual: external use, keep it dry, keep air vents clear, avoid impacts, and let it cool before storage. People with pacemakers or electronic implants, pregnancy, open wounds, bleeding, or reduced heat sensitivity should seek professional guidance first. Stop if discomfort occurs. Which product are you considering?",
      ),
      context: context || "iteracare",
    };
  }

  if (/\b(como usar|modo de usar|utilizar|funcionamento|how to use|use it|como se usa|modo de uso)\b/.test(input)) {
    return {
      text: translated(language,
        context === "renew"
          ? "O Renew Patch é apresentado como patch não transdérmico. O modo de uso e o tempo de aplicação devem seguir a embalagem oficial da versão vendida; eu não indico pontos para sintomas ou doenças. Confirme composição, integridade da pele e contraindicações antes de usar."
          : "O modo correto depende do produto e do modelo. No iTeraCare, siga o manual oficial para distância, temperatura, duração, áreas permitidas e resfriamento do aparelho. Não aplico protocolos para sintomas ou doenças. Informe o modelo exato e eu explico os cuidados gerais disponíveis.",
        context === "renew"
          ? "Renew Patch se presenta como un parche no transdérmico. El modo y el tiempo de uso deben seguir el envase oficial de la versión vendida; no indico puntos para síntomas o enfermedades. Confirma la composición, el estado de la piel y las contraindicaciones antes de usarlo."
          : "El uso correcto depende del producto y del modelo. Para iTeraCare, sigue el manual oficial sobre distancia, temperatura, duración, zonas permitidas y enfriamiento. No indico protocolos para síntomas o enfermedades. Dime el modelo exacto y te explico los cuidados generales.",
        context === "renew"
          ? "Renew Patch is presented as a non-transdermal patch. Follow the official packaging for the sold version regarding placement and wear time; I do not recommend points for symptoms or diseases. Confirm ingredients, skin condition, and contraindications before use."
          : "Correct use depends on the product and model. For iTeraCare, follow the official manual for distance, temperature, duration, permitted areas, and cooling. I do not provide protocols for symptoms or diseases. Name the exact model and I can explain the available general precautions.",
      ),
      context: context || "iteracare",
      focusQuestion: !context,
    };
  }

  if (/\b(voltagem|tensao|127|220|110|watts?|potencia|voltage|power|voltaje|potencia)\b/.test(input)) {
    return {
      text: translated(language,
        "No certificado brasileiro enviado, o iTera-Classic QYY-928 aparece em versões 127 V e 220 V, ambas com potência nominal de 650 W e 60 Hz. Isso não vale automaticamente para outros modelos. Confira a etiqueta do aparelho, a tomada local e a ficha técnica exata antes de ligar; nunca use tensão incompatível.",
        "En el certificado brasileño enviado, iTera-Classic QYY-928 aparece en versiones de 127 V y 220 V, ambas con potencia nominal de 650 W y 60 Hz. Esto no se aplica automáticamente a otros modelos. Revisa la etiqueta, la red eléctrica local y la ficha técnica exacta antes de conectarlo.",
        "In the submitted Brazilian certificate, the iTera-Classic QYY-928 appears in 127 V and 220 V versions, both rated at 650 W and 60 Hz. This does not automatically apply to other models. Check the appliance label, local supply, and exact specification sheet before plugging it in.",
      ),
      context: "iteracare",
    };
  }

  if (/\b(garantia|troca|devolucao|reembolso|nota fiscal|warranty|return|refund|invoice|garantia|cambio|devolucion|factura)\b/.test(input)) {
    return {
      text: translated(language,
        "Garantia, devolução e troca podem variar por país, canal e modelo. Antes da compra, confirme por escrito: prazo de garantia, cobertura, assistência, política de devolução, nota fiscal e quem paga o envio em caso de suporte. Guarde comprovante, número de série e embalagem. Posso conectar você ao consultor para confirmar as condições atuais.",
        "La garantía, devolución y cambio pueden variar según el país, el canal y el modelo. Antes de comprar, confirma por escrito el plazo, la cobertura, la asistencia, la política de devolución, la factura y quién paga el envío. Guarda comprobante, número de serie y embalaje. Puedo conectarte con el consultor para confirmar las condiciones actuales.",
        "Warranty, returns, and exchanges may vary by country, channel, and model. Before buying, confirm the term, coverage, service, return policy, invoice, and who pays shipping for support in writing. Keep the receipt, serial number, and packaging. I can connect you with the consultant to confirm current terms.",
      ),
      context: context || "catalog",
      showWhatsApp: true,
    };
  }

  if (/\b(tem no|disponivel|estoque|entrega|envio|pais|paraguai|brasil|available|stock|delivery|shipping|country|disponible|existencia|entrega|envio|pais)\b/.test(input)) {
    return {
      text: translated(language,
        "A disponibilidade muda conforme país, estoque, versão elétrica e regras locais. O catálogo oficial indica que algumas linhas não estão disponíveis em todos os mercados. Para evitar informação desatualizada, confirme modelo, tensão, prazo, frete, garantia e emissão de nota com o consultor do seu subdomínio.",
        "La disponibilidad cambia según el país, el inventario, la versión eléctrica y las reglas locales. El catálogo oficial indica que algunas líneas no están disponibles en todos los mercados. Confirma modelo, voltaje, plazo, envío, garantía y factura con el consultor de tu subdominio.",
        "Availability changes by country, stock, electrical version, and local rules. The official catalog notes that some lines are not offered in every market. Confirm the model, voltage, delivery time, shipping, warranty, and invoice with your subdomain consultant.",
      ),
      context: context || "catalog",
      showWhatsApp: true,
    };
  }

  if (context === "catalog" && /\b(quais|lista|catalogo|todos|linhas|series|what|which|list|cuales|lista)\b/.test(input)) {
    return {
      text: translated(language,
        "O catálogo oficial organiza produtos em Casa e Bem-estar, Energia, Saúde e Beleza. Entre as linhas estão iTeraCare, iTera-Bio, Bio Lite, IONShield, OxyTap, IonSleep, Vitality Energy, Renew Patch, Envy-Spec, Scalar Energy, Cellfood Plus e outras. A oferta muda por país. Diga uma linha e eu explico o que está confirmado.",
        "El catálogo oficial organiza productos en Hogar y bienestar, Energía, Salud y Belleza. Incluye iTeraCare, iTera-Bio, Bio Lite, IONShield, OxyTap, IonSleep, Vitality Energy, Renew Patch, Envy-Spec, Scalar Energy, Cellfood Plus y otras líneas. La oferta cambia por país. Dime una línea y explico lo confirmado.",
        "The official catalog groups products under Home Living, Energy, Health, and Beauty. Lines include iTeraCare, iTera-Bio, Bio Lite, IONShield, OxyTap, IonSleep, Vitality Energy, Renew Patch, Envy-Spec, Scalar Energy, Cellfood Plus, and others. Availability varies by country. Name a line and I’ll explain what is confirmed.",
      ),
      context: "catalog",
    };
  }

  if (context === "iterabio") {
    return {
      text: translated(language,
        "O iTera-Bio é apresentado no catálogo oficial como massageador de pés sem vibração, associado a ondas de terahertz e íons negativos. É uma tecnologia de bem-estar, não um dispositivo médico. Recursos, disponibilidade e orientações variam por versão; confirme o manual, a intensidade, os cuidados elétricos e a garantia antes do uso.",
        "iTera-Bio aparece en el catálogo oficial como un masajeador de pies sin vibración, asociado con ondas de terahercios e iones negativos. Es una tecnología de bienestar, no un dispositivo médico. Funciones, disponibilidad e instrucciones varían según la versión; confirma el manual, la intensidad, los cuidados eléctricos y la garantía.",
        "The official catalog presents iTera-Bio as a non-vibration foot massager associated with terahertz waves and negative ions. It is a wellness technology, not a medical device. Features, availability, and instructions vary by version; confirm the manual, intensity, electrical precautions, and warranty.",
      ),
      context: "iterabio",
    };
  }

  if (context === "biolite") {
    return {
      text: translated(language,
        "O iTera-Bio Lite é uma plataforma/massageador para os pés. O catálogo oficial informa 10 níveis de intensidade e menciona terahertz, energia sinusoidal e infravermelho distante com grafeno. É voltado ao bem-estar e não substitui cuidados de saúde. Confirme a versão, o manual e as contraindicações antes do uso.",
        "iTera-Bio Lite es una plataforma/masajeador para los pies. El catálogo oficial informa 10 niveles de intensidad y menciona terahercios, energía sinusoidal e infrarrojo lejano con grafeno. Está orientado al bienestar y no sustituye la atención médica. Confirma la versión, el manual y las contraindicaciones antes de usarlo.",
        "iTera-Bio Lite is a foot platform/massager. The official catalog lists 10 intensity levels and mentions terahertz, sinusoidal energy, and graphene far-infrared. It is intended for wellness and does not replace medical care. Confirm the version, manual, and contraindications before use.",
      ),
      context: "biolite",
    };
  }

  if (context === "oxytap" || context === "other-product") {
    return {
      text: translated(language,
        "Esse item aparece no catálogo oficial da PRIFE, mas especificações e disponibilidade podem variar por país e versão. Para não inventar benefícios ou dados técnicos, diga o nome completo do produto e o que deseja saber — finalidade, características, segurança, disponibilidade ou compra — e eu respondo com o que estiver confirmado.",
        "Este artículo aparece en el catálogo oficial de PRIFE, pero sus especificaciones y disponibilidad pueden variar según el país y la versión. Para no inventar beneficios ni datos técnicos, dime el nombre completo y qué deseas saber: finalidad, características, seguridad, disponibilidad o compra.",
        "This item appears in PRIFE’s official catalog, but specifications and availability may vary by country and version. To avoid inventing benefits or technical details, provide the full product name and what you want to know—purpose, features, safety, availability, or purchasing—and I’ll answer from confirmed information.",
      ),
      context,
      focusQuestion: true,
    };
  }

  if (context === "business" && /^(sim|si|yes|como funciona|fale mais|fala mais|mais|detalhes)$/.test(input)) {
    return {
      text: translated(language,
        "A oportunidade independente combina venda de produtos e desenvolvimento de equipe conforme o Plano de Marketing vigente. Antes de entrar, avalie investimento, custos recorrentes, treinamento, suporte, regras de cancelamento e como a remuneração depende de vendas e atividade. Não existe renda garantida. Quer entender cadastro, rotina ou perguntas para o consultor?",
        "La oportunidad independiente combina venta de productos y desarrollo de equipo según el Plan de Marketing vigente. Antes de entrar, evalúa inversión, costos recurrentes, capacitación, soporte, cancelación y cómo la remuneración depende de ventas y actividad. No hay ingresos garantizados. ¿Quieres entender el registro, la rutina o qué preguntar al consultor?",
        "The independent opportunity combines product sales and team development under the current Marketing Plan. Before joining, assess the investment, recurring costs, training, support, cancellation rules, and how compensation depends on sales and activity. Income is not guaranteed. Would you like registration steps, the routine, or questions for the consultant?",
      ),
      context: "business",
    };
  }

  if (context === "prife" && /^(sim|si|yes|como funciona|fale mais|fala mais|mais|detalhes)$/.test(input)) {
    return {
      text: translated(language,
        "A PRIFE International reúne linhas de casa e bem-estar, energia, saúde e beleza, além de uma oportunidade de atuação independente. Este site pertence a um distribuidor e oferece atendimento personalizado. Posso seguir por produtos, empresa, oportunidade ou cadastro. Qual caminho você prefere?",
        "PRIFE International reúne líneas de hogar y bienestar, energía, salud y belleza, además de una oportunidad de actividad independiente. Este sitio pertenece a un distribuidor y ofrece atención personalizada. Puedo seguir por productos, empresa, oportunidad o registro. ¿Qué prefieres?",
        "PRIFE International brings together home-living and wellness, energy, health, and beauty lines, along with an independent business opportunity. This distributor site provides personalized support. I can continue with products, the company, the opportunity, or registration. Which path do you prefer?",
      ),
      context: "prife",
    };
  }

  if (context && /^(sim|si|yes|como funciona|o que e|para que serve|serve pra que|what is it|how does it work|que es|para que sirve)$/.test(input)) {
    const contextualReply = materialKnowledgeReply(context, language);
    if (contextualReply) return { ...contextualReply, context };
  }

  if (context && /^(e |sobre )?(isso|ele|ela|esse|essa|mais|detalhes|continue|fala mais|fale mais|tell me more|more details|cuentame mas|mas detalles)$/.test(input)) {
    return {
      text: translated(language,
        "Posso aprofundar. Você quer saber a finalidade, como funciona, diferenças entre modelos, segurança, autenticidade, garantia, disponibilidade ou preço? Escolha um desses pontos.",
        "Puedo profundizar. ¿Quieres saber la finalidad, cómo funciona, diferencias entre modelos, seguridad, autenticidad, garantía, disponibilidad o precio? Elige uno de esos puntos.",
        "I can go deeper. Would you like its purpose, how it works, model differences, safety, authenticity, warranty, availability, or price? Choose one of those points.",
      ),
      context,
      focusQuestion: true,
    };
  }

  return null;
}

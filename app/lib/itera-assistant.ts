import {
  basicConversationReply,
  detectIteraContext,
  expertiseReply,
  salesCoachReply,
  type IteraContext,
} from "./itera-expertise";
import { materialKnowledgeReply, objectionReply } from "./itera-knowledge";
import type { SiteLanguage } from "./site-language";

const WELCOME_MESSAGES: Record<SiteLanguage, string> = {
  pt: "Olá! Eu sou o Assistente iTERA. O que você quer conhecer?",
  es: "¡Hola! Soy el Asistente iTERA. ¿Qué quieres conocer?",
  en: "Hello! I’m the iTERA Assistant. What would you like to explore?",
};

export function getIteraWelcomeMessage(language: SiteLanguage) {
  return WELCOME_MESSAGES[language];
}

export const ITERA_ASSISTANT_SYSTEM_PROMPT = `
Você é o Assistente iTERA, o assistente virtual oficial do site de um distribuidor independente PRIFE.

OBJETIVO
- Apresentar a PRIFE, suas tecnologias de bem-estar e a oportunidade de negócio de forma clara, acolhedora e responsável.
- Ajudar a pessoa a escolher o próximo passo e, quando houver intenção de compra ou cadastro, conectá-la ao consultor responsável pelo subdomínio via WhatsApp.
- Atender futuros clientes com uma abordagem consultiva: descobrir o interesse, entender a objeção, responder com evidências verificáveis e permitir uma decisão sem pressão.
- Conduzir a conversa para um de dois próximos passos reais: cadastro acompanhado ou compra orientada.
- Sempre terminar com uma única pergunta objetiva e um próximo passo claro.
- Quando a pessoa pedir somente “preço” ou “valor”, coletar uma ou duas informações (produto/benefício desejado e país) antes de apresentar valores.

COACH COMERCIAL
- Quando pedirem uma abordagem, mensagem, roteiro, prospecção ou quebra de objeção, entregue primeiro um texto pronto para copiar e usar.
- Personalize a abordagem pelo produto e pelo perfil do futuro cliente quando essas informações estiverem disponíveis.
- Oriente a sequência: abertura humana, pergunta de descoberta, apresentação compatível com a necessidade e convite sem compromisso.
- Nunca responda a um pedido comercial apenas com “fale com um consultor”. O WhatsApp é o próximo passo, não a resposta principal.
- Quando a pessoa escrever apenas “compra”, explique como você pode ajudar tanto quem deseja comprar quanto quem deseja abordar um cliente.

IDIOMA OBRIGATÓRIO
- Responda sempre no idioma ativo enviado pelo site: português do Brasil (pt), espanhol (es) ou inglês (en).
- Nunca misture idiomas na mesma resposta, exceto nomes oficiais de marcas e produtos.
- Ao trocar o idioma do site, reinicie a conversa e continue integralmente no novo idioma.
- Traduza também perguntas, objeções, próximos passos, avisos de segurança e encaminhamentos ao WhatsApp.

IDENTIDADE E TOM
- Apresente-se como “Assistente iTERA”.
- Use frases curtas, linguagem simples e tom humano, positivo e profissional no idioma ativo.
- Use emojis com moderação.
- Nunca diga que é médico, especialista de saúde ou representante da sede corporativa.

ESCOPO DE RESPOSTAS
- PRIFE: explique que é uma empresa internacional com um ecossistema de tecnologias de bem-estar, estilo de vida e oportunidade de negócio.
- Produtos: apresente iTeraCare Classic e Premium Plus, Vitality Energy, Envy Sun, Envy Specs, IONShield, iTera-Bio Lite, Renew Patch e MagnoSeek apenas com descrições informativas da base fornecida.
- Catálogo oficial: reconheça também iTeraCare Pro e Pro Plus, iTera-Bio, OxyTap, IonSleep, Smart Car Oxygen Bar, Scalar Energy, QFrequency, NXGEN, linhas de saúde e beleza. Quando não houver detalhe confirmado, diga que o item consta no catálogo e peça o nome/versão exatos.
- Oportunidade: explique que há possibilidade de atuação independente e que ganhos dependem de vendas, desenvolvimento da equipe, regras do plano e desempenho individual.
- Plano de Marketing: dê apenas uma visão geral. Direcione valores, percentuais, qualificações, regras vigentes e documentos oficiais ao consultor responsável.
- Cadastro: explique que o consultor acompanha o cadastro e compartilhe o botão do WhatsApp.
- Materiais fornecidos: use resumos de apresentações de produtos, negócio, eventos, PWG, autenticidade e certificação. Trate protocolos e depoimentos apenas como materiais de treinamento e relatos individuais, nunca como prova clínica.
- Lista de valores: quando perguntarem preço, use somente os valores da lista fornecida à PRIFE Brasil e identifique distribuidor, revenda sugerida e pontos. Avise que preço vigente, estoque, frete, pagamento e condições devem ser confirmados com o consultor.
- Fontes digitais: use o catálogo oficial prifeintl.com/products como referência principal de linhas e iterahertz.life como complemento indicado pelo distribuidor. Não repita alegações promocionais como fatos médicos.
- Prife Travel Club: explique benefícios, Escape Credits, portal, Dream Vacation e o fluxo geral de adesão a partir dos novos materiais. Valores, descontos, disponibilidade, meios de pagamento e regras devem ser apresentados como informações do material, sujeitas aos termos atuais.
- Prife Foundation: explique somente a atuação social, o voluntariado e os valores de cuidar, respeitar e transformar. Ignore permanentemente telefones, endereços, datas e horários presentes em artes de eventos.
- Objeções: acolha dúvidas sobre preço, confiança, autenticidade, resultados, tempo, experiência em vendas e experiências anteriores. Responda de modo direto, sem pressão ou manipulação.

REGRAS OBRIGATÓRIAS
- Não faça diagnóstico, prescrição ou promessa de cura, tratamento ou prevenção de doenças.
- Sempre informe que tecnologias de bem-estar não substituem avaliação ou acompanhamento de profissionais de saúde.
- Não prometa renda, retorno financeiro, enriquecimento ou resultado garantido.
- Não invente preços, promoções, estoque, especificações, certificações, países atendidos, percentuais ou regras do plano. Para preços, use exclusivamente a lista fornecida e deixe claro que pode ser atualizada.
- Quando não souber ou quando a informação puder ter mudado, diga isso com transparência e encaminhe ao consultor.
- Não solicite dados sensíveis, documentos, informações bancárias ou dados de saúde.
- Não pressione o visitante e não use linguagem enganosa.

INTENÇÃO COMERCIAL
- Considere intenção de compra ou cadastro quando a pessoa mencionar comprar, preço, valor, pedido, adquirir, cadastro, cadastrar, entrar, participar, ser distribuidor, começar agora ou falar com alguém.
- Nesses casos, responda: “Posso conectar você agora a um consultor pelo WhatsApp.”
- Em seguida, exiba o botão de WhatsApp usando o número e o nome do consultor do subdomínio atual.

FORMATO
- Responda em até 90 palavras, salvo quando a pessoa pedir detalhes, abordagem, roteiro ou quebra de objeção.
- Termine com uma pergunta simples ou um próximo passo útil.
- Use somente informações presentes neste prompt e no conteúdo oficial fornecido pelo site.
`.trim();

export type IteraTopic =
  | "register"
  | "purchase"
  | "support"
  | "how"
  | "prices"
  | "travel"
  | "objections";

const TOPIC_LABELS: Record<SiteLanguage, Array<{ id: IteraTopic; label: string }>> = {
  pt: [
    { id: "purchase", label: "Conhecer os produtos" },
    { id: "register", label: "Entender a oportunidade" },
    { id: "support", label: "Já sou distribuidor / suporte" },
    { id: "how", label: "Como funciona?" },
    { id: "prices", label: "Ver preços" },
    { id: "travel", label: "Private Travel Club" },
    { id: "objections", label: "Dúvidas / Objeções" },
  ],
  es: [
    { id: "purchase", label: "Conocer los productos" },
    { id: "register", label: "Entender la oportunidad" },
    { id: "support", label: "Ya soy distribuidor / soporte" },
    { id: "how", label: "¿Cómo funciona?" },
    { id: "prices", label: "Ver precios" },
    { id: "travel", label: "Private Travel Club" },
    { id: "objections", label: "Dudas / Objeciones" },
  ],
  en: [
    { id: "purchase", label: "Explore the products" },
    { id: "register", label: "Understand the opportunity" },
    { id: "support", label: "Distributor support" },
    { id: "how", label: "How does it work?" },
    { id: "prices", label: "View prices" },
    { id: "travel", label: "Private Travel Club" },
    { id: "objections", label: "Questions / Objections" },
  ],
};

export function getIteraTopics(language: SiteLanguage) {
  return TOPIC_LABELS[language];
}

export type IteraReply = {
  text: string;
  showWhatsApp?: boolean;
  focusQuestion?: boolean;
  context?: IteraContext;
};

const commercialIntent = /\b(comprar|compra|pre[cç]o|valor|pedido|adquirir|cadastro|cadastrar|inscrever|entrar|participar|distribuidor|come[cç]ar agora|falar com algu[eé]m|comprar|precio|pedido|adquirir|registro|registrarme|participar|distribuidor|empezar|hablar con alguien|buy|purchase|price|order|register|sign up|join|distributor|start now|talk to someone|whats(?:app)?)\b/i;
const healthSensitiveIntent = /\b(cura|curar|doen[cç]a|tratamento|diagn[oó]stico|dor|m[eé]dico|sa[uú]de|protocolo|terapia|aplica[cç][aã]o|reflexologia|sintoma|c[aâ]ncer|diabetes|press[aã]o|imunidade|enfermedad|tratamiento|diagn[oó]stico|dolor|m[eé]dico|salud|protocolo|terapia|s[ií]ntoma|presi[oó]n|inmunidad|cure|disease|treatment|diagnosis|pain|doctor|health|protocol|therapy|symptom|blood pressure|immunity)\b/i;

const TOPIC_REPLIES: Record<SiteLanguage, Record<IteraTopic, IteraReply>> = {
  pt: {
    register: { text: "Perfeito! 😊 Posso explicar a oportunidade independente com transparência, sem promessa de renda. Para orientar melhor: você já teve experiência com vendas ou negócio próprio, ou seria sua primeira vez? Depois, conecto você ao distribuidor responsável para conhecer regras, custos e suporte atuais.", focusQuestion: true, context: "business" },
    purchase: { text: "Perfeito! 😊 Posso comparar as opções sem empurrar um produto. Qual benefício você busca para sua rotina e qual produto chamou sua atenção — iTeraCare, iTera-Bio Lite, IONShield, MagnoSeek, óculos, pulseira ou Renew Patch? Próximo passo: diga seu objetivo e o país para eu orientar a compra.", focusQuestion: true, context: "catalog" },
    support: { text: "Claro! 😊 Para encaminhar seu suporte corretamente, diga em qual etapa você está e qual é a dúvida: cadastro, materiais, produtos, apresentação, Prospector, CRM ou sala ao vivo? Depois, posso conectar você ao responsável pelo seu subdomínio no WhatsApp.", focusQuestion: true, context: "sales" },
    how: { text: "Na PRIFE Brasil há dois caminhos: (1) cadastro acompanhado, para conhecer o ecossistema e a oportunidade independente conforme as regras vigentes; ou (2) compra orientada de um produto disponível no seu país. Não há renda nem resultado garantido. Próximo passo: você quer entender cadastro ou compra?", focusQuestion: true, context: "prife" },
    prices: { text: "Consigo orientar os valores da lista fornecida, mas quero evitar indicar a versão errada. Qual produto ou benefício você procura e em qual país está? Próximo passo: responda com esses dois dados para eu comparar a opção adequada e o valor de referência.", focusQuestion: true, context: "catalog" },
    travel: { text: "O Private Travel Club é apresentado como benefício para membros ativos da PRIFE. O material indica assinatura pelo equivalente de R$ 533,50/mês, 97 LRP Enhanced, Escape Credits, portal privado e certificados Dream Vacation, sempre sujeitos aos termos atuais. Você quer entender a assinatura, os créditos ou como acessar o portal?", focusQuestion: true, context: "travel" },
    objections: { text: "Pode falar com total sinceridade 😊 As dúvidas mais comuns são preço, confiança, autenticidade, resultado esperado, tempo e experiência anterior. Eu respondo com informação verificável, sem promessa e sem pressão. Próximo passo: qual é a sua principal dúvida hoje?", focusQuestion: true, context: "sales" },
  },
  es: {
    register: { text: "¡Perfecto! 😊 Puedo explicar la oportunidad independiente con transparencia y sin promesas de ingresos. ¿Ya tienes experiencia en ventas o negocio propio, o sería tu primera vez? Después puedo conectarte con el distribuidor responsable para conocer reglas, costos y soporte actuales.", focusQuestion: true, context: "business" },
    purchase: { text: "¡Perfecto! 😊 ¿Qué beneficio buscas y qué producto te interesa: iTeraCare, iTera-Bio Lite, IONShield, MagnoSeek, gafas, pulsera o Renew Patch? Próximo paso: dime tu objetivo y país para orientar la compra.", focusQuestion: true, context: "catalog" },
    support: { text: "¡Claro! 😊 Para dirigir bien tu soporte, dime en qué etapa estás y cuál es tu duda: registro, materiales, productos, presentación, Prospector, CRM o sala en vivo. Después puedo conectarte por WhatsApp con el responsable de tu subdominio.", focusQuestion: true, context: "sales" },
    how: { text: "En PRIFE Brasil hay dos caminos: (1) registro acompañado para conocer el ecosistema y la oportunidad independiente; o (2) compra orientada de un producto disponible en tu país. No existen ingresos ni resultados garantizados. Próximo paso: ¿registro o compra?", focusQuestion: true, context: "prife" },
    prices: { text: "Puedo orientarte con la lista proporcionada, pero necesito evitar una versión incorrecta. ¿Qué producto o beneficio buscas y en qué país estás? Próximo paso: responde esos dos datos para comparar la opción y el valor de referencia.", focusQuestion: true, context: "catalog" },
    travel: { text: "Private Travel Club se presenta como un beneficio para miembros activos de PRIFE. El material indica una suscripción por el equivalente de R$ 533,50/mes, 97 LRP Enhanced, Escape Credits, portal privado y certificados Dream Vacation, sujetos a los términos vigentes. ¿Quieres entender la suscripción, los créditos o el acceso al portal?", focusQuestion: true, context: "travel" },
    objections: { text: "Puedes hablar con total sinceridad 😊 Precio, confianza, autenticidad, resultado esperado y experiencias anteriores son dudas normales. Respondo sin promesas ni presión. Próximo paso: ¿cuál es tu principal duda?", focusQuestion: true, context: "sales" },
  },
  en: {
    register: { text: "Great! 😊 I can explain the independent opportunity transparently, with no income promises. Have you worked in sales or owned a business before, or would this be your first time? I can then connect you with the responsible distributor for current rules, costs, and support.", focusQuestion: true, context: "business" },
    purchase: { text: "Great! 😊 What benefit are you looking for, and which product interests you: iTeraCare, iTera-Bio Lite, IONShield, MagnoSeek, eyewear, bracelet, or Renew Patch? Next step: tell me your goal and country so I can guide the purchase.", focusQuestion: true, context: "catalog" },
    support: { text: "Of course! 😊 To route your support correctly, tell me your current stage and topic: registration, materials, products, presentation, Lead Finder, CRM, or live room. I can then connect you on WhatsApp with the person responsible for your subdomain.", focusQuestion: true, context: "sales" },
    how: { text: "PRIFE Brasil offers two paths: (1) guided registration to learn about the ecosystem and independent opportunity; or (2) a guided purchase of a product available in your country. Income and results are not guaranteed. Next step: registration or purchase?", focusQuestion: true, context: "prife" },
    prices: { text: "I can guide you using the supplied price list, but I need to avoid quoting the wrong version. Which product or benefit are you looking for, and which country are you in? Next step: send those two details for a suitable comparison.", focusQuestion: true, context: "catalog" },
    travel: { text: "Private Travel Club is presented as a benefit for active PRIFE members. The material states a membership equivalent to R$ 533.50/month with 97 LRP Enhanced, Escape Credits, a private portal, and Dream Vacation certificates, subject to current terms. Would you like the membership, credits, or portal access explained?", focusQuestion: true, context: "travel" },
    objections: { text: "You can be completely honest 😊 Price, trust, authenticity, expected results, and past experiences are normal concerns. I answer without promises or pressure. Next step: what is your main concern today?", focusQuestion: true, context: "sales" },
  },
};

export function topicReply(
  topic: IteraTopic,
  _consultantName: string,
  language: SiteLanguage = "pt",
): IteraReply {
  const reply = TOPIC_REPLIES[language][topic];
  const topicContext: Partial<Record<IteraTopic, IteraContext>> = {
    register: "business",
    purchase: "catalog",
    support: "sales",
    how: "prife",
    prices: "catalog",
    travel: "travel",
    objections: "sales",
  };
  const contextualReply = { ...reply, context: topicContext[topic] };
  return contextualReply;
}

export function freeQuestionReply(
  question: string,
  language: SiteLanguage = "pt",
  previousContext: IteraContext | null = null,
): IteraReply {
  const normalized = question.trim();
  const detectedContext = detectIteraContext(normalized);

  const basicReply = basicConversationReply(normalized, language);
  if (basicReply) return basicReply;

  const salesCoach = salesCoachReply(normalized, language, previousContext);
  if (salesCoach) return salesCoach;

  const objection = objectionReply(normalized, language);
  if (objection) return { ...objection, context: detectedContext || previousContext || undefined };

  if (healthSensitiveIntent.test(normalized)) {
    const safeReply = materialKnowledgeReply(normalized, language) || {
      text: {
        pt: "As tecnologias apresentadas são voltadas ao bem-estar e não substituem diagnóstico, prescrição ou acompanhamento de profissionais de saúde. Para uma orientação pessoal, procure um profissional habilitado. Posso ajudar com informações gerais e seguras sobre os produtos.",
        es: "Las tecnologías presentadas son de bienestar y no sustituyen el diagnóstico, la prescripción ni el seguimiento de profesionales de salud. Para una orientación personal, consulta a un profesional cualificado. Puedo ayudarte con información general y segura sobre los productos.",
        en: "The technologies presented are intended for wellness and do not replace diagnosis, prescriptions, or care from health professionals. For personal guidance, consult a qualified professional. I can help with general, safety-focused product information.",
      }[language],
    };
    return { ...safeReply, context: detectedContext || previousContext || undefined };
  }

  if (/^\s*(pre[cç]o|pre[cç]os|valor|valores|quanto custa|precio|precios|price|prices|how much)\s*[?!.,]*\s*$/i.test(normalized)) {
    return topicReply("prices", "", language);
  }
  if (/^\s*(comprar|compra|quero comprar|buy|purchase|quiero comprar)\s*[?!.,]*\s*$/i.test(normalized)) {
    return topicReply("purchase", "", language);
  }
  if (/^\s*(cadastro|cadastrar|quero me cadastrar|registro|registrarme|register|sign up)\s*[?!.,]*\s*$/i.test(normalized)) {
    return topicReply("register", "", language);
  }
  if (previousContext === "business" && /\b(agora|ritmo|neg[oó]cio|oportunidade|cadastro|registro|now|pace|business|ahora|negocio)\b/i.test(normalized)) {
    return {
      text: {
        pt: "Entendi ✅ Com esse objetivo, o próximo passo é confirmar as condições atuais e fazer o cadastro acompanhado. Posso conectar você agora ao consultor pelo WhatsApp. Você prefere começar agora ou agendar um horário?",
        es: "Entendido ✅ El siguiente paso es confirmar las condiciones actuales y realizar el registro acompañado. Puedo conectarte ahora con el consultor por WhatsApp. ¿Prefieres empezar ahora o agendar un horario?",
        en: "Understood ✅ The next step is to confirm the current terms and complete guided registration. I can connect you with the consultant on WhatsApp now. Would you rather start now or schedule a time?",
      }[language],
      showWhatsApp: true,
      focusQuestion: true,
      context: "business",
    };
  }

  if (/\b(pre[cç]os?|valores?|quanto custa|custo|precio|precios|cu[aá]nto cuesta|costo|price|prices|how much|cost)\b/i.test(normalized)) {
    const suppliedPrice = materialKnowledgeReply(normalized, language);
    if (suppliedPrice) return { ...suppliedPrice, context: detectedContext || previousContext || undefined };
  }

  const expertReply = expertiseReply(normalized, language, previousContext);
  if (expertReply) return expertReply;

  if (commercialIntent.test(normalized)) {
    if (/^\s*(compra|comprar|purchase|buy|compra|comprar)\s*$/i.test(normalized)) {
      return {
        text: {
          pt: "Posso ajudar de duas formas:\n\n1. Se você quer comprar, diga o produto e o país para eu orientar a comparação, os cuidados e o que confirmar antes do pedido.\n\n2. Se você quer abordar um cliente, use: “Olá, [nome]! Antes de indicar um produto PRIFE, quero entender o que você busca para sua rotina. Posso te mostrar opções sem compromisso?”\n\nVocê quer comprar ou preparar uma abordagem de venda?",
          es: "Puedo ayudarte de dos formas:\n\n1. Si quieres comprar, dime el producto y el país para orientar la comparación y lo que debes confirmar.\n\n2. Si quieres abordar a un cliente, usa: “¡Hola, [nombre]! Antes de recomendar un producto PRIFE, quisiera entender qué buscas para tu rutina. ¿Puedo mostrarte opciones sin compromiso?”\n\n¿Quieres comprar o preparar un enfoque de venta?",
          en: "I can help in two ways:\n\n1. If you want to buy, name the product and country so I can guide the comparison and what to confirm.\n\n2. If you want to approach a customer, use: “Hi [name]! Before suggesting a PRIFE product, I’d like to understand what you want for your routine. May I show you a few options with no obligation?”\n\nDo you want to buy or prepare a sales approach?",
        }[language],
        showWhatsApp: true,
        focusQuestion: true,
        context: "sales",
      };
    }
    return {
      text: {
        pt: "Posso ajudar com isso. Para preço, estoque, compra ou cadastro, o consultor precisa confirmar as condições atuais do seu país e do modelo escolhido. Posso conectar você agora pelo WhatsApp.",
        es: "Puedo ayudarte. Para precio, inventario, compra o registro, el consultor debe confirmar las condiciones actuales de tu país y del modelo elegido. Puedo conectarte ahora por WhatsApp.",
        en: "I can help. For price, stock, purchasing, or registration, the consultant needs to confirm the current terms for your country and chosen model. I can connect you now on WhatsApp.",
      }[language],
      showWhatsApp: true,
      context: detectedContext || previousContext || "business",
    };
  }

  const materialReply = materialKnowledgeReply(normalized, language);
  if (materialReply) return { ...materialReply, context: detectedContext || previousContext || undefined };

  if (/\b(dinheiro|ganh|renda|neg[oó]cio|oportunidade|dinero|ganar|ingreso|negocio|money|earn|income|business|opportunity|marketing|plano?|plan)\b/i.test(normalized)) {
    return topicReply("register", "", language);
  }
  if (/\b(prife|empresa|quem s[aã]o|como funciona|quienes son|company|who are|how does it work)\b/i.test(normalized)) {
    return topicReply("how", "", language);
  }

  return {
    text: {
      pt: "Quero entender melhor sua pergunta para responder certo. Ela é sobre PRIFE, algum produto, segurança, compra, cadastro ou oportunidade de negócio? Se puder, escreva o nome do produto ou uma frase um pouco mais completa.",
      es: "Quiero entender mejor tu pregunta para responder correctamente. ¿Es sobre PRIFE, un producto, seguridad, compra, registro o la oportunidad de negocio? Escribe el nombre del producto o una frase un poco más completa.",
      en: "I want to understand your question so I can answer accurately. Is it about PRIFE, a product, safety, purchasing, registration, or the business opportunity? Please include the product name or a slightly fuller sentence.",
    }[language],
    focusQuestion: true,
    context: previousContext || undefined,
  };
}

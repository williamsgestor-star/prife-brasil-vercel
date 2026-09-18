import type { IteraContext } from "./itera-expertise";
import type { SiteLanguage } from "./site-language";

export type IteraKnowledgeReply = {
  text: string;
  showWhatsApp?: boolean;
  context?: IteraContext;
};

const HEALTH_TERMS = /\b(cura|curar|doen[cç]a|tratamento|diagn[oó]stico|dor|m[eé]dico|sa[uú]de|protocolo|terapia|aplica[cç][aã]o|ponto|reflexologia|sintoma|c[aâ]ncer|diabetes|press[aã]o|circula[cç][aã]o|imunidade|enfermedad|dolor|salud|s[ií]ntoma|presi[oó]n|circulaci[oó]n|inmunidad|cure|disease|treatment|diagnosis|pain|doctor|health|protocol|therapy|symptom|blood pressure|circulation|immunity)\b/i;
const TESTIMONIAL_TERMS = /\b(depoimento|relato|resultado|antes e depois|comprovad[oa]|efic[aá]cia|funciona mesmo|testimonio|antes y despu[eé]s|comprobado|eficacia|funciona realmente|testimonial|before and after|proven|efficacy|does it work)\b/i;
const CERTIFICATE_TERMS = /\b(inmetro|certificad[oa]|certifica[cç][aã]o|anatel|ce\s?emc|patente|laudo|seguran[cç]a)\b/i;
const AUTHENTICITY_TERMS = /\b(fake|falso|falsifica[cç][aã]o|original|genu[ií]no|aut[eê]ntic[oa]|proced[eê]ncia|falsificaci[oó]n|aut[eé]ntico|genuine|authentic|counterfeit)\b/i;
const GLASSES_TERMS = /\b([oó]culos|gafas|glasses|envy[ -]?(spec|sun)|luz azul|blue light|lente|lens)\b/i;
const BRACELET_TERMS = /\b(pulseira|pulsera|bracelet|vitality|[ií]on negativo|negative ion|[aâ]nion)\b/i;
const MAGNOSEEK_TERMS = /\b(magnoseek|biorresson[aâ]ncia|bio-?resson[aâ]ncia|biorresonancia|bioresonance|an[aá]lise de dados|an[aá]lisis de datos|data analysis)\b/i;
const ITERACARE_TERMS = /\b(iteracare|itera[ -]?(classic|premium|care)|terahertz|soprador)\b/i;
const IONSHIELD_TERMS = /\b(ion ?shield|pingente ionizador|pingente de [ií]ons?|colgante ionizador|ionizing pendant)\b/i;
const BIOLITE_TERMS = /\b(itera[ -]?bio lite|bio lite|plataforma para os p[eé]s|plataforma para los pies|foot platform)\b/i;
const RENEW_TERMS = /\b(renew patch|patch|adesivo n[aã]o transd[eé]rmico|parche|non-transdermal)\b/i;
const CELLFOOD_TERMS = /\b(cellfood|suplemento|supplement|sel[eê]nio|selenio|selenium|amino[aá]cido|amino acid|enzima|enzyme)\b/i;
const PWG_TERMS = /\b(pwg|prife wellness gallery|wellness gallery|galeria de bem-estar|galer[ií]a de bienestar)\b/i;
const TRAVEL_TERMS = /\b(prife travel club|private travel club|private travel|travel club|ptc|clube de viage(?:m|ns)|clube da viagem|club de viajes|travel membership|travel subscription|assinatura (?:da|de) viage(?:m|ns)|assinatura do clube de viage(?:m|ns)|mensalidade (?:da|de) viage(?:m|ns)|suscripci[oó]n de viajes?|membres[ií]a de viajes?|travel portal|portal de viagens|portal de viajes|escape credits?|cr[eé]ditos? escape|lrp enhanced|lrp aprimorado|dream vacation|f[eé]rias dos sonhos|vacaciones de ensue[nñ]o|pontos? de registro|puntos? de registro|register points?|top up)\b/i;
const ESCAPE_CREDIT_TERMS = /\b(escape credits?|cr[eé]ditos? escape|mec[aâ]nica dos? cr[eé]ditos?|mec[aá]nica de los cr[eé]ditos?)\b/i;
const DREAM_VACATION_TERMS = /\b(dream vacation|f[eé]rias dos sonhos|vacaciones de ensue[nñ]o|certificado de viagem|certificado de viaje|travel certificate|voucher de f[eé]rias|vale de f[eé]rias)\b/i;
const TRAVEL_HOWTO_TERMS = /\b(como funciona (?:a )?assinatura|como (come[cç]ar|ativar|assinar|entrar|pagar|fazer top up)|ativar assinatura|assinar o|assinatura (?:da|de) viage(?:m|ns)|mensalidade (?:da|de) viage(?:m|ns)|top up|pontos? de registro|register points?|\brp\b|\bbp\b|carteira|wallet|iniciar sesi[oó]n|suscribirse|activar|how (?:does the membership work|to (?:start|activate|subscribe|pay))|sign up)\b/i;
const FOUNDATION_TERMS = /\b(prife foundation|foundation|funda[cç][aã]o prife|acci[oó]n social prife|a[cç][aã]o social prife|volunt[aá]ri[oa]|volunteer|voluntariado)\b/i;
const PRODUCT_TERMS = /\b(produto|producto|product|tecnologia|tecnolog[ií]a|technology|acess[oó]rio|accesorio|accessory|cat[aá]logo|catalog|linha|l[ií]nea|line)\b/i;
const PRICE_TERMS = /\b(pre[cç]os?|valores?|quanto custa|custo|tabela de valores|lista de pre[cç]os?|precio|precios|valor|cu[aá]nto cuesta|costo|lista de precios|price|prices|how much|cost|price list)\b/i;

const PRIFE_PRICE_LIST = [
  { name: "iTeraCare Classic Plus", match: /\b(iteracare|itera)[ -]?classic plus\b/i, brl: "R$ 3.025", resale: "R$ 4.500", points: "200" },
  { name: "iTeraCare Classic", match: /\b(iteracare|itera)[ -]?classic\b/i, brl: "R$ 2.475", resale: "R$ 3.500", points: "200" },
  { name: "iTera-Bio Lite", match: /\b(itera[ -]?bio lite|bio[ -]?lite)\b/i, brl: "R$ 8.250", resale: "R$ 12.500", points: "600" },
  { name: "Vitality Energy (pulseira)", match: /\b(vitality energy|pulseira|pulsera|bracelet)\b/i, brl: "R$ 825", resale: "R$ 899", points: "70" },
  { name: "Óculos Envy", match: /\b([oó]culos envy|envy specs?|gafas envy|envy glasses)\b/i, brl: "R$ 522,50", resale: "R$ 749", points: "55" },
  { name: "Óculos de Sol Aurora", match: /\b(aurora|[oó]culos de sol|gafas de sol|sunglasses)\b/i, brl: "R$ 715", resale: "R$ 899", points: "70" },
  { name: "IONShield", match: /\b(ion ?shield|pingente ionizador|colgante ionizador|ionizing pendant)\b/i, brl: "R$ 2.200", resale: "R$ 2.900", points: "200" },
  { name: "MagnoSeek", match: /\b(magnoseek|magno seek)\b/i, brl: "R$ 31.900", resale: "R$ 41.500", points: "2.000" },
  { name: "Renew Patch", match: /\b(renew patch|renew|patch|parche)\b/i, brl: "R$ 357,50", resale: "R$ 460", points: "35" },
] as const;

export const ITERA_KNOWLEDGE_SOURCES = [
  "apresentações institucionais e de produtos fornecidas pela empresa",
  "materiais sobre iTeraCare Classic e Premium Plus, MagnoSeek, óculos e pulseiras",
  "certificados e materiais de orientação sobre autenticidade",
  "materiais de negócio, eventos e PWG",
  "materiais explicativos e operacionais do Prife Travel Club",
  "material institucional da Prife Foundation, sem dados temporários de eventos",
  "lista de valores de produtos PRIFE fornecida pelo distribuidor",
  "mapas, protocolos de treinamento e depoimentos, tratados com limites de segurança",
  "catálogo oficial da PRIFE International (prifeintl.com/products)",
  "FAQ e páginas informativas complementares indicadas pelo distribuidor (iterahertz.life)",
] as const;

function translated(language: SiteLanguage, pt: string, es: string, en: string) {
  return { pt, es, en }[language];
}

function priceKnowledgeReply(question: string, language: SiteLanguage): IteraKnowledgeReply | null {
  if (!PRICE_TERMS.test(question)) return null;

  const product = PRIFE_PRICE_LIST.find((item) => item.match.test(question));
  const currentTerms = translated(
    language,
    "Valores da lista fornecida à PRIFE Brasil; confirme preço vigente, estoque, frete, forma de pagamento e condições com o consultor.",
    "Valores de la lista proporcionada a PRIFE Brasil; confirma precio vigente, inventario, envío, forma de pago y condiciones con el consultor.",
    "Values from the price list supplied to PRIFE Brasil; confirm current pricing, stock, shipping, payment method, and terms with the consultant.",
  );

  if (product) {
    return {
      text: translated(
        language,
        `${product.name}: distribuidor ${product.brl}; revenda sugerida ${product.resale}; ${product.points} pontos. ${currentTerms}`,
        `${product.name}: distribuidor ${product.brl}; reventa sugerida ${product.resale}; ${product.points} puntos. ${currentTerms}`,
        `${product.name}: distributor ${product.brl}; suggested resale ${product.resale}; ${product.points} points. ${currentTerms}`,
      ),
      showWhatsApp: true,
    };
  }

  const labels = {
    pt: { distributor: "distribuidor", resale: "revenda", points: "pts", unit: "unidade" },
    es: { distributor: "distribuidor", resale: "reventa", points: "pts", unit: "unidad" },
    en: { distributor: "distributor", resale: "resale", points: "pts", unit: "unit" },
  }[language];
  const rows = PRIFE_PRICE_LIST
    .map((item) => `${item.name}: ${labels.distributor} ${item.brl}; ${labels.resale} ${item.resale}; ${item.points} ${labels.points}`)
    .concat(`Renew Patch (${labels.unit}): ${labels.resale} R$ 22`)
    .join("\n");

  return {
    text: `${rows}\n\n${currentTerms}`,
    showWhatsApp: true,
  };
}

export function materialKnowledgeReply(
  question: string,
  language: SiteLanguage = "pt",
): IteraKnowledgeReply | null {
  const isTravelQuestion = TRAVEL_TERMS.test(question);
  if (!isTravelQuestion) {
    const priceReply = priceKnowledgeReply(question, language);
    if (priceReply) return priceReply;
  }

  if (FOUNDATION_TERMS.test(question)) {
    return {
      text: translated(language,
        "A Prife Foundation representa a frente de ação social apresentada pela PRIFE. O material destaca voluntariado e os valores de cuidar, respeitar e transformar, com a ideia de que pequenas atitudes podem gerar grandes transformações. Datas, horários, endereços e telefones das artes de eventos não fazem parte da base permanente. Você quer uma apresentação institucional ou uma abordagem para convidar voluntários?",
        "Prife Foundation representa la iniciativa de acción social presentada por PRIFE. El material destaca el voluntariado y los valores de cuidar, respetar y transformar, con la idea de que pequeñas acciones pueden generar grandes cambios. Fechas, horarios, direcciones y teléfonos de eventos no forman parte de la base permanente. ¿Quieres una presentación institucional o un mensaje para invitar voluntarios?",
        "Prife Foundation represents the social-action initiative presented by PRIFE. The material highlights volunteering and the values of caring, respecting, and transforming, based on the idea that small actions can create meaningful change. Event dates, times, addresses, and phone numbers are not retained in the permanent knowledge base. Would you like an institutional introduction or a volunteer invitation message?",
      ),
      context: "foundation",
    };
  }

  if (isTravelQuestion && PRICE_TERMS.test(question)) {
    return {
      text: translated(language,
        "O material apresenta a assinatura pelo equivalente de R$ 533,50 ao mês. Enquanto a conta permanece ativa, ele informa retorno de 97 LRP Enhanced e acesso aos benefícios do Prife Travel Club. Valores, impostos, meios de pagamento e condições podem ser atualizados; por isso, confirme o total vigente no back office ou com o consultor antes de ativar. Quer que eu explique o que está incluído ou o passo a passo da adesão?",
        "El material presenta la suscripción por el equivalente de R$ 533,50 al mes. Mientras la cuenta permanece activa, informa el retorno de 97 LRP Enhanced y acceso a los beneficios de Prife Travel Club. Valores, impuestos, medios de pago y condiciones pueden actualizarse; confirma el total vigente antes de activar. ¿Quieres saber qué incluye o ver el proceso de adhesión?",
        "The material presents the membership at an equivalent of R$ 533.50 per month. While the account stays active, it states that members receive 97 LRP Enhanced and access to Prife Travel Club benefits. Pricing, taxes, payment methods, and terms may change, so confirm the current total before activation. Would you like the included benefits or the sign-up steps?",
      ),
      showWhatsApp: true,
      context: "travel",
    };
  }

  if (isTravelQuestion && TRAVEL_HOWTO_TERMS.test(question) && !DREAM_VACATION_TERMS.test(question)) {
    return {
      text: translated(language,
        "A assinatura do Prife Travel Club é um benefício para membros ativos da PRIFE, não um plano MLM separado. O material indica o equivalente de R$ 533,50 ao mês e retorno de 97 LRP Enhanced. Para aderir: tenha saldo de RP ou BP, abra Navegar > Prife Travel Club, informe o usuário, escolha o período e confirme. Depois, o acesso chega ao e-mail cadastrado. Os meios de recarga variam por país. Quer conhecer os cinco benefícios ou falar com o consultor para confirmar o valor atual?",
        "La suscripción de Prife Travel Club es un beneficio para miembros activos de PRIFE, no un plan MLM separado. El material indica el equivalente de R$ 533,50 al mes y retorno de 97 LRP Enhanced. Para adherirte: ten saldo de RP o BP, abre Navegar > Prife Travel Club, informa el usuario, elige el período y confirma. El acceso llega al correo registrado. ¿Quieres conocer los cinco beneficios o confirmar el valor actual?",
        "Prife Travel Club membership is a benefit for active PRIFE members, not a separate MLM plan. The material states an equivalent of R$ 533.50 per month with 97 LRP Enhanced returned. To join, keep RP or BP in the account, open Navigate > Prife Travel Club, enter the member username, select the period, and confirm. Access is then sent to the registered email. Would you like the five benefits or help confirming current terms?",
      ),
      showWhatsApp: true,
      context: "travel",
    };
  }

  if (ESCAPE_CREDIT_TERMS.test(question)) {
    return {
      text: translated(language,
        "Segundo o material, membros recebem 1 Escape Credit por mês ativo, acumulado desde o primeiro mês e exibido como crédito, não como valor monetário. Os marcos de 4, 8 e 12 créditos são indicadores e não geram reserva ou pagamento automático. O documento também menciona regras de pausa, reativação e preservação por até 12 meses. Como essas condições podem mudar, confirme sempre os termos atuais no canal oficial.",
        "Según el material, los miembros reciben 1 Escape Credit por mes activo, acumulado desde el primer mes y mostrado como crédito, no como valor monetario. Los hitos de 4, 8 y 12 créditos son indicadores y no generan reservas ni pagos automáticos. El documento también menciona reglas de pausa, reactivación y conservación por hasta 12 meses. Confirma siempre los términos actuales en el canal oficial.",
        "According to the material, members receive one Escape Credit per active month, accumulated from month one and displayed as credits rather than dollar value. The 4-, 8-, and 12-credit milestones are indicators and do not trigger automatic bookings or payments. The document also mentions pause, reactivation, and balance-preservation rules for up to 12 months. Always confirm current terms through the official channel.",
      ),
      context: "travel",
    };
  }

  if (DREAM_VACATION_TERMS.test(question)) {
    return {
      text: translated(language,
        "Os materiais apresentam o Dream Vacation como certificado de viagem para estadias promocionais em resorts, sujeito a ativação, prazo, disponibilidade, destinos, tipo de acomodação, taxas e demais termos. O fluxo mostrado é: receber o certificado, ativá-lo pelo canal indicado, criar o perfil e pesquisar a disponibilidade. Exemplos de destinos, percentuais e preços são ilustrativos e não devem ser tratados como oferta garantida.",
        "Los materiales presentan Dream Vacation como un certificado de viaje para estancias promocionales en resorts, sujeto a activación, plazo, disponibilidad, destinos, tipo de alojamiento, tasas y demás términos. El flujo mostrado es: recibir el certificado, activarlo por el canal indicado, crear el perfil y consultar disponibilidad. Los destinos, porcentajes y precios de ejemplo son ilustrativos y no representan una oferta garantizada.",
        "The materials present Dream Vacation as a travel certificate for promotional resort stays, subject to activation, validity, availability, destinations, accommodation type, fees, and other terms. The illustrated flow is to receive the certificate, activate it through the indicated channel, create a profile, and search availability. Example destinations, percentages, and prices are illustrative and are not guaranteed offers.",
      ),
      context: "travel",
    };
  }

  if (isTravelQuestion) {
    return {
      text: translated(language,
        "O Prife Travel Club é um benefício para membros ativos da PRIFE, não um plano MLM separado. O material apresenta uma assinatura pelo equivalente de R$ 533,50/mês com cinco frentes: manutenção de 15 PV, 97 LRP Enhanced, 1 Escape Credit por mês ativo, portal privado para hotéis, cruzeiros, carros, voos e casas, e certificados Dream Vacation. Reservas, descontos, garantia de preço e certificados seguem disponibilidade e termos vigentes. Você quer entender a assinatura, os créditos ou o portal?",
        "Prife Travel Club es un beneficio para miembros activos de PRIFE, no un plan MLM separado. El material presenta una suscripción por el equivalente de R$ 533,50/mes con cinco áreas: mantenimiento de 15 PV, 97 LRP Enhanced, un Escape Credit por mes activo, portal privado y certificados Dream Vacation. Reservas, descuentos y certificados dependen de disponibilidad y términos vigentes. ¿Quieres conocer la suscripción, los créditos o el portal?",
        "Prife Travel Club is a benefit for active PRIFE members, not a separate MLM plan. The material presents a membership equivalent to R$ 533.50/month with five areas: 15 PV maintenance, 97 LRP Enhanced, one Escape Credit per active month, a private travel portal, and Dream Vacation certificates. Bookings, discounts, and certificates remain subject to availability and current terms. Would you like the membership, credits, or portal explained?",
      ),
      context: "travel",
    };
  }

  if (HEALTH_TERMS.test(question)) {
    return {
      text: translated(language,
        "Os materiais fornecidos incluem mapas de pontos e protocolos de treinamento, mas eu não indico aplicações para sintomas ou doenças. O iTeraCare é apresentado como aparelho de bem-estar, não como dispositivo médico. Tecnologias de bem-estar não substituem avaliação, diagnóstico ou tratamento profissional. Confirme o manual do modelo com um consultor e procure um profissional de saúde quando houver queixa clínica.",
        "Los materiales incluyen mapas de puntos y protocolos de capacitación, pero no indico aplicaciones para síntomas o enfermedades. iTeraCare se presenta como un dispositivo de bienestar, no como un dispositivo médico. Estas tecnologías no sustituyen la evaluación, el diagnóstico ni el tratamiento profesional. Confirma el manual con un consultor y consulta a un profesional de salud ante cualquier problema clínico.",
        "The materials include point maps and training protocols, but I do not recommend applications for symptoms or diseases. iTeraCare is presented as a wellness appliance, not a medical device. Wellness technologies do not replace professional evaluation, diagnosis, or treatment. Confirm the model manual with a consultant and see a health professional for clinical concerns.",
      ),
    };
  }

  if (TESTIMONIAL_TERMS.test(question)) {
    return {
      text: translated(language,
        "Há relatos individuais nos materiais enviados, mas depoimentos não comprovam eficácia nem garantem que outra pessoa terá o mesmo resultado. Considere a finalidade do produto, as especificações verificáveis e orientação profissional quando houver questão de saúde. Qual produto ou informação você quer avaliar?",
        "Los materiales contienen relatos individuales, pero los testimonios no demuestran eficacia ni garantizan el mismo resultado para otras personas. Considera la finalidad del producto, las especificaciones verificables y la orientación profesional cuando exista una cuestión de salud. ¿Qué producto o información deseas evaluar?",
        "The materials contain individual accounts, but testimonials do not prove effectiveness or guarantee the same result for someone else. Consider the product’s intended purpose, verifiable specifications, and professional guidance for health concerns. Which product or information would you like to evaluate?",
      ),
    };
  }

  if (AUTHENTICITY_TERMS.test(question)) {
    return {
      text: translated(language,
        "Para reduzir o risco de falsificação, confira vendedor autorizado, nota fiscal, identificação exata do modelo, embalagem, número de série e documentos correspondentes. Não é seguro concluir que um produto é original apenas por foto ou aparência. Um consultor pode confirmar o canal de compra e os dados do modelo antes do pedido.",
        "Para reducir el riesgo de falsificación, verifica el vendedor autorizado, la factura, el modelo exacto, el embalaje, el número de serie y los documentos correspondientes. No es seguro concluir que un producto es original solo por una foto o su apariencia. Un consultor puede confirmar el canal de compra y los datos del modelo antes del pedido.",
        "To reduce counterfeit risk, verify the authorized seller, invoice, exact model, packaging, serial number, and supporting documents. A photo or appearance alone cannot prove authenticity. A consultant can confirm the purchase channel and model details before you order.",
      ),
      showWhatsApp: true,
    };
  }

  if (CERTIFICATE_TERMS.test(question)) {
    return {
      text: translated(language,
        "O certificado brasileiro enviado é o ABCP-ELE-10272-25-01, emitido em 06/08/2025 para os modelos iTera-Classic QYY-928 de 127 V e 220 V. O escopo informado é eletrodomésticos, família secador de cabelos — não certificação médica. A regularidade deve ser conferida na base oficial do Inmetro. Outros laudos também devem ser verificados na fonte original.",
        "El certificado brasileño enviado es ABCP-ELE-10272-25-01, emitido el 06/08/2025 para los modelos iTera-Classic QYY-928 de 127 V y 220 V. El alcance indicado corresponde a electrodomésticos, familia de secadores de cabello; no es una certificación médica. Su vigencia debe verificarse en la base oficial de Inmetro. Otros informes también deben comprobarse en su fuente original.",
        "The submitted Brazilian certificate is ABCP-ELE-10272-25-01, issued on August 6, 2025, for 127 V and 220 V iTera-Classic QYY-928 models. Its stated scope is household appliances in the hair-dryer family—not medical certification. Its status should be checked in Inmetro’s official database. Other reports should also be verified at their original source.",
      ),
    };
  }

  if (GLASSES_TERMS.test(question)) {
    return {
      text: translated(language,
        "Os materiais apresentam Envy Specs e Envy Sun como óculos de estilo, conforto visual e proteção de lentes. Alegações promocionais sobre luz azul e íons negativos não devem ser tratadas como diagnóstico, prevenção ou tratamento. Para grau, proteção UV e especificações ópticas, confirme o modelo atual e consulte um profissional de saúde visual.",
        "Los materiales presentan Envy Specs y Envy Sun como gafas de estilo, comodidad visual y protección de lentes. Las afirmaciones promocionales sobre luz azul e iones negativos no deben entenderse como diagnóstico, prevención ni tratamiento. Para graduación, protección UV y especificaciones ópticas, confirma el modelo y consulta a un profesional de salud visual.",
        "The materials present Envy Specs and Envy Sun as eyewear for style, visual comfort, and lens protection. Promotional claims about blue light and negative ions should not be treated as diagnosis, prevention, or treatment. For prescriptions, UV protection, and optical specifications, confirm the current model and consult an eye-care professional.",
      ),
    };
  }

  if (BRACELET_TERMS.test(question)) {
    return {
      text: translated(language,
        "A Vitality Energy é apresentada como pulseira de uso diário, feita em silicone e associada nos materiais a minerais e íons negativos. Ela é um acessório de bem-estar e estilo, não um dispositivo médico. Alegações sobre circulação, imunidade, dor, força ou sono não garantem benefício clínico. Um consultor pode confirmar modelos, materiais e disponibilidade.",
        "Vitality Energy se presenta como una pulsera de uso diario, fabricada en silicona y asociada en los materiales con minerales e iones negativos. Es un accesorio de bienestar y estilo, no un dispositivo médico. Las afirmaciones sobre circulación, inmunidad, dolor, fuerza o sueño no garantizan beneficios clínicos. Un consultor puede confirmar modelos, materiales y disponibilidad.",
        "Vitality Energy is presented as an everyday silicone bracelet associated in the materials with minerals and negative ions. It is a wellness and lifestyle accessory, not a medical device. Claims about circulation, immunity, pain, strength, or sleep do not guarantee clinical benefit. A consultant can confirm models, materials, and availability.",
      ),
    };
  }

  if (MAGNOSEEK_TERMS.test(question)) {
    return {
      text: translated(language,
        "O MagnoSeek é apresentado como tecnologia informativa e não invasiva que combina análise de dados, IA e conceitos de bioressonância. Seus resultados não equivalem a exame, diagnóstico ou recomendação médica e devem ser interpretados com cautela. Confirme finalidade, versão e demonstração atuais com um consultor.",
        "MagnoSeek se presenta como una tecnología informativa y no invasiva que combina análisis de datos, IA y conceptos de biorresonancia. Sus resultados no equivalen a un examen, diagnóstico o recomendación médica y deben interpretarse con cautela. Confirma su finalidad, versión y demostración actuales con un consultor.",
        "MagnoSeek is presented as a non-invasive informational technology combining data analysis, AI, and bioresonance concepts. Its results are not equivalent to a medical test, diagnosis, or recommendation and should be interpreted cautiously. Confirm the current purpose, version, and demonstration with a consultant.",
      ),
    };
  }

  if (IONSHIELD_TERMS.test(question)) {
    return {
      text: translated(language,
        "O IONShield é apresentado como pingente ionizador recarregável para bem-estar e uso cotidiano. O catálogo oficial informa peso de 10 g, carregamento rápido de cerca de 40 minutos e autonomia anunciada de até 18 horas. Esses dados podem variar por versão. Alegações sobre qualidade do ar não devem ser entendidas como prevenção ou tratamento de problemas respiratórios.",
        "IONShield se presenta como un colgante ionizador recargable para el bienestar y el uso diario. Las afirmaciones promocionales sobre iones negativos y calidad del aire no deben entenderse como prevención ni tratamiento de problemas respiratorios. Confirma autonomía, carga, cuidados, garantía y especificaciones actuales con un consultor.",
        "IONShield is presented as a rechargeable ionizing pendant for wellness and everyday use. The official catalog lists a 10 g weight, about 40 minutes for fast charging, and advertised battery life of up to 18 hours. These details may vary by version. Air-quality claims should not be understood as preventing or treating respiratory problems.",
      ),
      context: "ionshield",
    };
  }

  if (BIOLITE_TERMS.test(question)) {
    return {
      text: translated(language,
        "O iTera-Bio Lite é apresentado como plataforma para os pés voltada a relaxamento e bem-estar. Os materiais associam o produto a diferentes tecnologias e benefícios promocionais, mas ele não substitui avaliação ou tratamento de saúde. Antes de usar, confira manual, contraindicações, cuidados elétricos, garantia e modelo atual com um consultor.",
        "iTera-Bio Lite se presenta como una plataforma para los pies orientada a la relajación y el bienestar. Los materiales la asocian con distintas tecnologías y beneficios promocionales, pero no sustituye la evaluación ni el tratamiento de salud. Antes de usarla, revisa el manual, contraindicaciones, cuidados eléctricos, garantía y modelo actual con un consultor.",
        "iTera-Bio Lite is presented as a foot platform for relaxation and wellness. The materials associate it with various technologies and promotional benefits, but it does not replace health evaluation or treatment. Before use, review the manual, contraindications, electrical safety, warranty, and current model with a consultant.",
      ),
    };
  }

  if (RENEW_TERMS.test(question)) {
    return {
      text: translated(language,
        "O Renew Patch é apresentado como patch não transdérmico associado a conceitos de biofield e ressonância. Isso não deve ser interpretado como diagnóstico, prevenção ou tratamento, e eu não indico pontos de aplicação para sintomas. Para composição, modo de uso, contraindicações e versão atual, consulte a embalagem oficial e um profissional habilitado quando houver questão de saúde.",
        "Renew Patch se presenta como un parche no transdérmico asociado con conceptos de biocampo y resonancia. Esto no debe interpretarse como diagnóstico, prevención ni tratamiento, y no indico puntos de aplicación para síntomas. Para composición, modo de uso, contraindicaciones y versión actual, consulta el envase oficial y a un profesional cualificado ante cuestiones de salud.",
        "Renew Patch is presented as a non-transdermal patch associated with biofield and resonance concepts. This should not be interpreted as diagnosis, prevention, or treatment, and I do not recommend application points for symptoms. For ingredients, directions, contraindications, and the current version, consult the official packaging and a qualified professional for health concerns.",
      ),
    };
  }

  if (CELLFOOD_TERMS.test(question)) {
    return {
      text: translated(language,
        "Os materiais também citam suplementos e ingredientes nutricionais. Eu não indico dosagem, não avalio interação com medicamentos e não prometo benefício para doenças. Confira rótulo, registro aplicável, composição, alergênicos e orientações oficiais. Gestantes, crianças e pessoas com condições de saúde ou em uso de medicamentos devem consultar profissional habilitado.",
        "Los materiales también mencionan suplementos e ingredientes nutricionales. No indico dosis, no evalúo interacciones con medicamentos ni prometo beneficios para enfermedades. Revisa la etiqueta, el registro aplicable, la composición, los alérgenos y las instrucciones oficiales. Embarazadas, niños y personas con problemas de salud o medicamentos deben consultar a un profesional cualificado.",
        "The materials also mention supplements and nutritional ingredients. I do not recommend dosages, assess drug interactions, or promise disease-related benefits. Check the label, applicable registration, ingredients, allergens, and official directions. Pregnant people, children, and anyone with health conditions or taking medication should consult a qualified professional.",
      ),
    };
  }

  if (PWG_TERMS.test(question)) {
    return {
      text: translated(language,
        "PWG significa Prife Wellness Gallery. O material apresenta um espaço físico para demonstração de produtos e atendimento, com critérios de inscrição, operação, investimento, comissões e incentivos. Como valores, requisitos e regras podem mudar, eles não são uma proposta vigente nem promessa de retorno. Um consultor deve fornecer os documentos atuais antes de qualquer decisão.",
        "PWG significa Prife Wellness Gallery. El material presenta un espacio físico para demostración de productos y atención, con criterios de inscripción, operación, inversión, comisiones e incentivos. Como los valores, requisitos y reglas pueden cambiar, no constituyen una propuesta vigente ni una promesa de retorno. Un consultor debe proporcionar los documentos actuales antes de cualquier decisión.",
        "PWG stands for Prife Wellness Gallery. The material presents a physical space for product demonstrations and service, with enrollment, operation, investment, commission, and incentive criteria. Because values, requirements, and rules may change, this is not a current offer or a promise of return. A consultant should provide current documents before any decision.",
      ),
      showWhatsApp: true,
    };
  }

  if (ITERACARE_TERMS.test(question)) {
    return {
      text: translated(language,
        "Os materiais apresentam iTeraCare Classic, Premium, Premium Plus, Pro e Pro Plus como aparelhos externos de bem-estar com tecnologia de terahertz. Eles não são dispositivos médicos e eu não oriento uso para doenças ou sintomas. Antes da compra, confirme modelo, tensão, manual, garantia, procedência e certificação vigente. O que você quer comparar: modelos, segurança ou compra?",
        "Los materiales presentan modelos iTeraCare, incluidos Classic y Premium Plus, como dispositivos de bienestar con tecnología de terahercios. No son dispositivos médicos y no recomiendo su uso para enfermedades o síntomas. Antes de comprar, confirma el modelo, voltaje, manual, garantía, origen y certificación vigente con un consultor. ¿Quieres comparar modelos, seguridad o compra?",
        "The materials present iTeraCare Classic, Premium, Premium Plus, Pro, and Pro Plus as external-use wellness appliances using terahertz technology. They are not medical devices, and I do not recommend use for diseases or symptoms. Before buying, confirm the model, voltage, manual, warranty, origin, and current certification. Would you like to compare models, safety, or purchasing?",
      ),
      context: "iteracare",
    };
  }

  if (PRODUCT_TERMS.test(question)) {
    return {
      text: translated(language,
        "A base inclui materiais sobre iTeraCare, MagnoSeek, Envy Specs, Envy Sun, Vitality Energy, IONShield, iTera-Bio Lite, Renew Patch e outras linhas PRIFE. Posso explicar a finalidade informativa de cada produto sem transformar alegações promocionais em promessa de saúde. Qual produto chamou sua atenção?",
        "La base incluye materiales sobre iTeraCare, MagnoSeek, Envy Specs, Envy Sun, Vitality Energy, IONShield, iTera-Bio Lite, Renew Patch y otras líneas PRIFE. Puedo explicar la finalidad informativa de cada producto sin convertir afirmaciones promocionales en promesas de salud. ¿Qué producto te interesa?",
        "The knowledge base includes iTeraCare, MagnoSeek, Envy Specs, Envy Sun, Vitality Energy, IONShield, iTera-Bio Lite, Renew Patch, and other PRIFE lines. I can explain each product’s informational purpose without turning promotional claims into health promises. Which product interests you?",
      ),
    };
  }

  return null;
}

export function objectionReply(
  question: string,
  language: SiteLanguage = "pt",
): IteraKnowledgeReply | null {
  if (/\b(caro|pre[cç]o alto|sem dinheiro|n[aã]o tenho dinheiro|n[aã]o cabe|or[cç]amento|costoso|precio alto|sin dinero|presupuesto|expensive|high price|no money|budget)\b/i.test(question)) {
    return {
      text: translated(language,
        "Entendo — o valor precisa fazer sentido para sua realidade. Confirme o preço atual, o que está incluído, garantia, suporte e condições de pagamento; depois compare com sua necessidade real. Não recomendo assumir compromisso financeiro por impulso. Um consultor pode apresentar as opções sem obrigação de compra.",
        "Entiendo: el valor debe tener sentido para tu realidad. Confirma el precio actual, qué incluye, la garantía, el soporte y las condiciones de pago; después compáralo con tu necesidad real. No recomiendo asumir un compromiso financiero por impulso. Un consultor puede presentarte las opciones sin obligación de compra.",
        "I understand—the cost needs to make sense for your situation. Confirm the current price, what is included, warranty, support, and payment terms, then compare these with your real need. I do not recommend making a financial commitment on impulse. A consultant can present the options with no purchase obligation.",
      ),
      showWhatsApp: true,
    };
  }

  if (/\b(golpe|pir[aâ]mide|confian[cç]a|confi[aá]vel|tenho medo|suspeito|estafa|confianza|confiable|tengo miedo|scam|pyramid|trust|reliable|afraid|suspicious)\b/i.test(question)) {
    return {
      text: translated(language,
        "É uma preocupação legítima. Avalie documentos da empresa, contrato, política de troca, canal oficial, nota fiscal, produtos e regras atuais de remuneração. Não decida apenas por promessa, urgência ou depoimento. Não existe renda garantida: resultados dependem de vendas, atividade e regras do plano. Posso indicar perguntas para fazer ao consultor.",
        "Es una preocupación legítima. Revisa los documentos de la empresa, el contrato, la política de cambios, el canal oficial, la factura, los productos y las reglas actuales de remuneración. No decidas solo por promesas, urgencia o testimonios. No hay ingresos garantizados: los resultados dependen de ventas, actividad y reglas del plan. Puedo sugerirte preguntas para el consultor.",
        "That is a legitimate concern. Review company documents, the contract, return policy, official channel, invoice, products, and current compensation rules. Do not decide based only on promises, urgency, or testimonials. Income is not guaranteed; results depend on sales, activity, and plan rules. I can suggest questions to ask the consultant.",
      ),
    };
  }

  if (/\b(vou pensar|preciso pensar|falar com (meu|minha)|marido|esposa|fam[ií]lia|depois eu vejo|voy a pensar|necesito pensar|hablar con mi|familia|lo ver[eé] despu[eé]s|think about it|need to think|talk to my|family|see later)\b/i.test(question)) {
    return {
      text: translated(language,
        "Claro — uma boa decisão não precisa de pressão. Posso resumir os pontos principais para você conversar com calma: finalidade do produto ou negócio, custo total, garantia, suporte, riscos e próximos passos. Qual desses pontos você gostaria de esclarecer antes?",
        "Claro: una buena decisión no necesita presión. Puedo resumir los puntos principales para que los revises con calma: finalidad del producto o negocio, costo total, garantía, soporte, riesgos y próximos pasos. ¿Cuál de estos puntos deseas aclarar primero?",
        "Of course—a good decision does not require pressure. I can summarize the main points for you to review calmly: the product or business purpose, total cost, warranty, support, risks, and next steps. Which point would you like to clarify first?",
      ),
    };
  }

  if (/\b(n[aã]o tenho tempo|falta de tempo|muito ocupad[oa]|rotina corrida|no tengo tiempo|falta de tiempo|muy ocupad[oa]|i have no time|no time|very busy)\b/i.test(question)) {
    return {
      text: translated(language,
        "Faz sentido avaliar a rotina antes de começar. O tempo necessário depende das atividades escolhidas e não há resultado automático. Peça ao consultor uma visão realista das tarefas, treinamentos e acompanhamento; então compare com sua disponibilidade semanal. Quer conhecer primeiro o produto ou a oportunidade?",
        "Tiene sentido evaluar tu rutina antes de comenzar. El tiempo necesario depende de las actividades elegidas y no hay resultados automáticos. Pide al consultor una visión realista de las tareas, capacitaciones y seguimiento; después compárala con tu disponibilidad semanal. ¿Quieres conocer primero el producto o la oportunidad?",
        "It makes sense to assess your routine before starting. The time required depends on the activities you choose, and results are not automatic. Ask the consultant for a realistic view of tasks, training, and support, then compare that with your weekly availability. Would you like to learn about the product or the opportunity first?",
      ),
    };
  }

  if (/\b(n[aã]o sei vender|n[aã]o gosto de vender|sem experi[eê]ncia|nunca trabalhei|tenho vergonha|no s[eé] vender|no me gusta vender|sin experiencia|me da verg[uü]enza|cannot sell|don't like selling|no experience|never worked|shy)\b/i.test(question)) {
    return {
      text: translated(language,
        "Experiência comercial pode ajudar, mas o principal é entender o produto, comunicar com transparência e aprender o processo. Antes do cadastro, confirme o treinamento, o suporte e as atividades esperadas. Não existe ganho garantido. Posso conectar você a um consultor para conhecer o acompanhamento antes de decidir.",
        "La experiencia comercial puede ayudar, pero lo principal es entender el producto, comunicar con transparencia y aprender el proceso. Antes de registrarte, confirma la capacitación, el soporte y las actividades esperadas. No hay ingresos garantizados. Puedo conectarte con un consultor para conocer el acompañamiento antes de decidir.",
        "Sales experience can help, but what matters most is understanding the product, communicating transparently, and learning the process. Before registering, confirm the training, support, and expected activities. Income is not guaranteed. I can connect you with a consultant so you can review the support before deciding.",
      ),
      showWhatsApp: true,
    };
  }

  if (/\b(j[aá] tentei|n[aã]o deu certo|perdi dinheiro|marketing multin[ií]vel|ya intent[eé]|no funcion[oó]|perd[ií] dinero|multinivel|i tried|didn't work|lost money|multi-level marketing|mlm)\b/i.test(question)) {
    return {
      text: translated(language,
        "Sua experiência anterior merece ser considerada. Antes de entrar novamente, compare investimento total, cancelamento, demanda real por produtos, remuneração ligada a vendas, custos recorrentes e suporte. Peça tudo por escrito e não aceite promessa de retorno. Posso ajudar a montar perguntas objetivas para o consultor.",
        "Tu experiencia anterior debe ser considerada. Antes de participar nuevamente, compara la inversión total, cancelación, demanda real de productos, remuneración vinculada a ventas, costos recurrentes y soporte. Pide todo por escrito y no aceptes promesas de retorno. Puedo ayudarte a preparar preguntas objetivas para el consultor.",
        "Your previous experience deserves consideration. Before joining again, compare the total investment, cancellation terms, real product demand, sales-based compensation, recurring costs, and support. Get everything in writing and do not accept promises of returns. I can help you prepare objective questions for the consultant.",
      ),
    };
  }

  return null;
}

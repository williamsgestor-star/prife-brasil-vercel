// Base de conhecimento extraída dos materiais oficiais em PDF (public/pdfs), lidos por OCR.
// Fatos de produto (o que é, como funciona, recursos, modo de uso, cuidados) e o que o material
// do fabricante APRESENTA como benefício. O assistente deve citar benefícios como "o material da
// Prife apresenta/associa", nunca como promessa médica.

export type MaterialEntry = { key: string; match: RegExp; text: string };

export const PRODUCT_MATERIALS: MaterialEntry[] = [
  {
    key: "iteracare",
    match: /itera ?care|iteracare|itera classic|classic plus|premium plus|itera pro|pro plus|terahertz|secador|soprador|aparelho azul/i,
    text: `iTeraCare (linha: Classic, Classic Plus, Premium, Premium Plus, Pro e Pro Plus). Aparelho portátil externo, em formato de soprador, que combina tecnologia terahertz com calor (ar morno direcionado ao corpo). Fabricante: De Shang Health Technology (China, fundada em 2015); a Prife International é a agente global. O primeiro dispositivo terahertz foi criado em 2014 pelo cientista Yang Wen Jun. Possui tubo de cristal óptico quântico de terahertz, refinado a cerca de 1.800 °C por 12 dias.
iTeraCare Classic Plus (6ª geração), 5 recursos: (1) voltagem global 100 V a 240 V, pode ser usado em viagens internacionais; (2) gerador de íons negativos que libera até 200 milhões de íons, que ajudam a "limpar" partículas do ar (pólen, fumaça) e estão associados a sensação de bem-estar, humor e disposição (o próprio material diz que as evidências científicas são mistas e os efeitos geralmente leves); (3) qualidade e segurança testadas pela SGS; (4) tubo de energia terahertz removível, troca sem ferramentas e manutenção mais barata; (5) motor brushless, mais eficiente e com vida útil até 3 vezes maior que gerações anteriores.
Indicadores de temperatura: azul = temperatura ambiente; laranja = 55 °C; vermelho = 75 °C (para usar sobre roupas mais grossas). Lembrete: a luz pisca 3 vezes a cada 2 minutos; após 35 minutos contínuos pisca sem parar; após 40 minutos entra em proteção e desliga por 15 minutos.
Certificação no Brasil: certificado de conformidade Inmetro nº ABCP-ELE-10272-25-01 (família "secador de cabelos", normas IEC 60335), emitido em 06/08/2025 e válido até 06/08/2031, em nome da Prife Internacional Brasil.
Como se usa (guia de sopro da Prife, abordagem da Medicina Tradicional Chinesa): beber 2 copos de água morna antes; aquecer o corpo soprando cerca de 2 a 3 minutos em cada área, na sequência de 10 pontos (começa pelas palmas das mãos e sola dos pés, passa por virilha e axilas, entre outros). Há um guia de pontos de aplicação por região do corpo para treinamento.
Cuidados (não soprar diretamente): gestantes, menstruação, stent no coração, dentro dos olhos ou lente implantada, feridas abertas, ossos/objetos implantados.
Aviso oficial da Prife: iTeraCare NÃO é dispositivo médico; não cura doenças e não deve ser apresentado como complemento de tratamento ou medicamento.`,
  },
  {
    key: "biolite",
    match: /bio ?lite|itera ?bio|tapete|manta|grafeno/i,
    text: `iTera-Bio Lite. Equipamento de bem-estar que une 3 tecnologias principais: ondas terahertz (sensação reconfortante, calmante e revigorante), energia senoidal (equilíbrio do corpo e da mente) e raios de grafeno (relaxamento e alívio da tensão do dia a dia; o material diz que o grafeno chega a 3 a 4 cm abaixo da pele). Usa também campo eletromagnético pulsado (PEMF) e raio infravermelho distante, que aquece rapidamente a pele e favorece o fluxo sanguíneo. Libera íons negativos. Tem detecção automática de contato para operação segura.
Funções apresentadas no material: eliminar o frio e a umidade (conceito da Medicina Tradicional Chinesa), apoiar a circulação e o metabolismo, apoiar a "limpeza" do corpo, contorno corporal, beleza e antienvelhecimento (pele com aparência mais jovem e brilhante) e aumento da vitalidade.
Público citado: quem sente frio nas extremidades, cansaço, tensão, quem fica muito tempo sentado ou em pé.
Lembrete: é tecnologia de bem-estar; não substitui avaliação médica.`,
  },
  {
    key: "bracelet",
    match: /pulseira|vitality|bracelete|bracelet/i,
    text: `Vitality Energy (pulseira). Feita em gel de biossílica de grau alimentício, com nanotecnologia e pó mineral de ânions; tem 3 pedras magnéticas de íons negativos de alta concentração e libera continuamente mais de 1.700 íons negativos. Macia, durável, à prova d'água e resistente ao suor. Placa de energia em rosé gold ou prata com cristal; pulseira de silicone em várias cores (paleta Morandi), troca fácil; gravação "Vitality Energy". Três modelos: prata, preta e vermelha.
O material associa ao uso: melhor qualidade do sono, recuperação de energia, conforto corporal, circulação e disposição no dia a dia.
Indicada no material para: profissionais ocupados e empreendedores, trabalho de escritório, estudantes sob pressão, idosos, quem fica muito em pé, motoristas de longa distância e atletas.`,
  },
  {
    key: "glasses",
    match: /[óo]culos|envy|aurora|luz azul|specs|sun\b/i,
    text: `Óculos Envy Specs (de grau/descanso) e Envy Sun / Aurora (de sol). "SPA para os olhos": proteção contra luz azul, lentes ópticas exclusivas, liberação de íons negativos (material cita 200 milhões por dia) e infravermelho longo; 7 tecnologias. Lentes testadas pelo Centro de Inspeção de Produtos Ópticos de Guangdong, em conformidade com as normas QB/T2506-2017, GB 13511-2011 e GB 10810.3-2006.
O material associa ao uso: alívio da fadiga e do cansaço visual, mais conforto em telas (lembra que olhamos o celular ~150 vezes por dia e passamos 10+ horas em telas), relaxamento dos músculos dos olhos e mais foco. Recomenda usar cerca de 8 horas por dia.
Lembrete: não substituem consulta oftalmológica nem lentes de correção prescritas.`,
  },
  {
    key: "renew",
    match: /renew|patch|adesivo/i,
    text: `Renew Patch. Adesivo não transdérmico (não passa substância para a pele) com Tecnologia de Ressonância do Biocampo (BRT), da Nature's Frequencies, patenteada nos EUA: frequências extraídas de ingredientes botânicos/bioativos são gravadas no adesivo. Nova fórmula.
Modo de uso: aplicar na região de desconforto ou onde quiser sentir mais o efeito, ou em pontos de acupressão (há diagrama); fixa melhor em pele limpa, seca e sem pelos; pode reforçar com fita atlética ou curativo; cada adesivo dura até 3 dias. Pode ser usado também em pets.
O material associa ao uso: mais energia e vitalidade, menos fadiga e desconforto, melhor sono e relaxamento, mobilidade e flexibilidade, desempenho esportivo e recuperação, pele com aspecto mais jovem.
Venda: caixa ou unidade.`,
  },
  {
    key: "magnoseek",
    match: /magno ?seek|bio-?resson|biorresson|scanner|analisador/i,
    text: `MagnoSeek. Sistema de bem-estar com inteligência artificial e bio-ressonância, baseado também em conceitos da Medicina Tradicional Chinesa. Usa uma pulseira-sensor no pulso (não invasivo: sem sangue, sem radiação) que capta sinais de frequência; os dados vão para um servidor em nuvem, a IA compara com um banco de dados de bem-estar e gera um relatório personalizado em tempo real (PDF ou celular). Depois emite frequências de "alinhamento" para equilíbrio energético. Vem com tablet. Certificação SGS.
Para quem: crianças, adultos e idosos; também usado por profissionais de bem-estar e terapeutas como ferramenta de trabalho. NÃO recomendado para quem usa implantes eletrônicos (marca-passo, CDI, neuroestimulador) nem para gestantes sem orientação médica.
Aviso oficial: o MagnoSeek NÃO é dispositivo médico, não diagnostica, não trata nem previne doenças; é para consciência de bem-estar e escolhas de estilo de vida.`,
  },
  {
    key: "ionshield",
    match: /ion ?shield|ionizador|purificador|colar|pingente/i,
    text: `iON Shield (Mini IONShield). Ionizador de ar portátil para usar no pescoço como pingente: pesa cerca de 10 gramas, emite 60 milhões de íons negativos, é silencioso e não precisa trocar filtro. Carrega em cerca de 40 minutos e funciona aproximadamente 8 horas. O material destaca a filtragem por íons de partículas do ar (PM2.5, fumaça de cigarro, poeira) ao redor de quem usa, e lembra dados da OMS sobre poluição do ar. Disponível em cores (consulte).`,
  },
  {
    key: "vision-eye",
    match: /ess[êe]ncia ocular|eye essen|vision eye|col[íi]rio/i,
    text: `Essência Ocular Vision (Vision Prife Eye Essence). Frasco de 5 ml da linha Vision da Prife, para o cuidado diário com os olhos. Para detalhes de composição e modo de uso, confirme o rótulo e a bula com o consultor; não substitui orientação oftalmológica.`,
  },
  {
    key: "cellfood",
    match: /cellfood|cell food|gotas|[áa]gua do mar|algas/i,
    text: `Cellfood Plus. Gotas com água do mar e algas marinhas ("mixed seawater and seaweed drops"), frasco de 30 ml (1 fl oz), fórmula presente no mercado desde 1969; recebeu o Advanced Technology Award do International Hall of Fame (1997). Modo de uso e dosagem: seguir o rótulo e confirmar com o consultor. É suplemento, não medicamento.`,
  },
  {
    key: "scalar",
    match: /scalar|escalar|discos/i,
    text: `Scalar Energy Shield. Discos com tecnologia de energia escalar ("Quantum Science · Scalar Energy") da Prife, vendidos em estojo premium com várias unidades, para levar no dia a dia (bolso, carteira, celular, ambientes). Para detalhes de uso, confirme com o consultor.`,
  },
];

const CATALOG_INDEX = `Produtos do site com valor de venda no Brasil: iTeraCare Classic Plus R$ 4.500; iTera-Bio Lite R$ 12.500; Vitality Energy (pulseira) R$ 899; Envy Sun / Aurora (óculos de sol) R$ 899; Envy Specs R$ 749; Renew Patch R$ 460 (caixa); MagnoSeek R$ 41.500; iON Shield R$ 2.900; Essência Ocular Vision R$ 320; Cellfood Plus R$ 511; Scalar Energy Shield R$ 350.`;

/* Escolhe os materiais pela pergunta atual e, se ela for curta ou vaga ("ele", "modelo"), pelo assunto anterior. */
export function materialsFor(question: string, previous: string[] = [], context?: string | null) {
  const hits = PRODUCT_MATERIALS.filter((m) => m.match.test(question));
  if (!hits.length) {
    const recent = previous.slice(-4).join(" ");
    PRODUCT_MATERIALS.forEach((m) => { if (m.match.test(recent) && !hits.includes(m)) hits.push(m); });
  }
  if (!hits.length && context) {
    const byContext = PRODUCT_MATERIALS.find((m) => m.key === context);
    if (byContext) hits.push(byContext);
  }
  return [CATALOG_INDEX, ...hits.slice(0, 2).map((m) => m.text)].join("\n\n");
}

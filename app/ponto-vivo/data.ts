export type BodyView = "front" | "back";

export type Meridian = {
  code: string;
  name: string;
  traditional: string;
  count: number;
  color: string;
};

export type PointRecord = {
  code: string;
  pinyin: string;
  portuguese: string;
  meridian: string;
  location: string;
  rationale: string;
  technique: string;
  duration: string;
  cautions: string[];
  view: BodyView;
  x: number;
  y: number;
  bilateral?: boolean;
};

export type RegionProtocol = {
  label: string;
  objective: string;
  points: string[];
  professionalReview?: boolean;
};

export const meridians: Meridian[] = [
  { code: "LU", name: "Pulmão", traditional: "Shou Taiyin", count: 11, color: "#9ad7ff" },
  { code: "LI", name: "Intestino Grosso", traditional: "Shou Yangming", count: 20, color: "#f1df8d" },
  { code: "ST", name: "Estômago", traditional: "Zu Yangming", count: 45, color: "#ffd166" },
  { code: "SP", name: "Baço", traditional: "Zu Taiyin", count: 21, color: "#f59fc4" },
  { code: "HT", name: "Coração", traditional: "Shou Shaoyin", count: 9, color: "#ff7b8b" },
  { code: "SI", name: "Intestino Delgado", traditional: "Shou Taiyang", count: 19, color: "#ff9f69" },
  { code: "BL", name: "Bexiga", traditional: "Zu Taiyang", count: 67, color: "#69a7ff" },
  { code: "KI", name: "Rim", traditional: "Zu Shaoyin", count: 27, color: "#8b8cff" },
  { code: "PC", name: "Pericárdio", traditional: "Shou Jueyin", count: 9, color: "#ff6f91" },
  { code: "TE", name: "Triplo Aquecedor", traditional: "Shou Shaoyang", count: 23, color: "#40e0d0" },
  { code: "GB", name: "Vesícula Biliar", traditional: "Zu Shaoyang", count: 44, color: "#9ce85b" },
  { code: "LR", name: "Fígado", traditional: "Zu Jueyin", count: 14, color: "#54d88d" },
  { code: "GV", name: "Vaso Governador", traditional: "Du Mai", count: 28, color: "#8de8ff" },
  { code: "CV", name: "Vaso Concepção", traditional: "Ren Mai", count: 24, color: "#f6a6ff" },
];

export const curatedPoints: Record<string, PointRecord> = {
  LI4: {
    code: "LI4", pinyin: "Hégǔ", portuguese: "Vale da União", meridian: "LI",
    location: "Dorso da mão, entre o primeiro e o segundo metacarpos, na região radial do segundo metacarpo.",
    rationale: "Tradicionalmente relacionado à modulação de desconfortos de cabeça, face e membro superior.",
    technique: "Pressão confortável com o polegar, sem provocar dor aguda, formigamento ou perda de sensibilidade.",
    duration: "30–45 segundos, 2 ciclos por lado.",
    cautions: ["Não usar durante a gravidez sem liberação profissional.", "Evitar sobre pele inflamada, lesionada ou com perda de sensibilidade."],
    view: "front", x: 13, y: 52, bilateral: true,
  },
  LI10: {
    code: "LI10", pinyin: "Shǒusānlǐ", portuguese: "Três Milhas do Braço", meridian: "LI",
    location: "Face lateral do antebraço, aproximadamente dois B-cun abaixo de LI11, na linha em direção ao punho.",
    rationale: "Usado tradicionalmente para tensão e desconforto do antebraço, cotovelo e braço.",
    technique: "Massagem circular suave a moderada, mantendo o braço relaxado.",
    duration: "45 segundos, 2 ciclos por lado.",
    cautions: ["Evitar se houver trauma recente, edema importante ou suspeita de fratura."],
    view: "front", x: 20, y: 44, bilateral: true,
  },
  LI15: {
    code: "LI15", pinyin: "Jiānyú", portuguese: "Osso do Ombro", meridian: "LI",
    location: "Região anterior e lateral do ombro, em uma depressão próxima ao acrômio quando o braço é elevado.",
    rationale: "Tradicionalmente empregado em tensão e limitação funcional do ombro.",
    technique: "Contato amplo com dois dedos; pressão leve, sem forçar elevação do braço.",
    duration: "30 segundos, 2 ciclos por lado.",
    cautions: ["Não pressionar após luxação, queda recente, cirurgia ou dor intensa ao movimento."],
    view: "front", x: 28, y: 27, bilateral: true,
  },
  PC6: {
    code: "PC6", pinyin: "Nèiguān", portuguese: "Barreira Interna", meridian: "PC",
    location: "Face palmar do antebraço, dois B-cun acima da prega do punho, entre os tendões centrais.",
    rationale: "Tradicionalmente associado ao relaxamento do antebraço e ao conforto geral.",
    technique: "Pressão gradual e confortável, com o punho em posição neutra.",
    duration: "45–60 segundos, 2 ciclos por lado.",
    cautions: ["Evitar sobre acesso vascular, hematoma, inflamação ou alteração de sensibilidade."],
    view: "front", x: 17, y: 48, bilateral: true,
  },
  PC8: {
    code: "PC8", pinyin: "Láogōng", portuguese: "Palácio do Trabalho", meridian: "PC",
    location: "Centro da palma, entre o segundo e o terceiro metacarpos, próximo ao ponto tocado pelo dedo médio ao fechar a mão.",
    rationale: "Usado tradicionalmente para relaxamento da mão e sensação de tensão palmar.",
    technique: "Movimentos circulares leves com o polegar, mantendo os dedos relaxados.",
    duration: "30–45 segundos, 2 ciclos por lado.",
    cautions: ["Evitar em cortes, queimaduras, dermatites ou inflamação local."],
    view: "front", x: 12, y: 55, bilateral: true,
  },
  TE5: {
    code: "TE5", pinyin: "Wàiguān", portuguese: "Barreira Externa", meridian: "TE",
    location: "Face posterior do antebraço, dois B-cun acima da prega dorsal do punho, entre rádio e ulna.",
    rationale: "Tradicionalmente relacionado a desconfortos de punho, antebraço, ombro e lateral da cabeça.",
    technique: "Pressão moderada e estável, sem comprimir nervos ou causar choque irradiado.",
    duration: "30–45 segundos, 2 ciclos por lado.",
    cautions: ["Interromper se houver choque, dormência ou irradiação para os dedos."],
    view: "back", x: 17, y: 47, bilateral: true,
  },
  SI3: {
    code: "SI3", pinyin: "Hòuxī", portuguese: "Riacho Posterior", meridian: "SI",
    location: "Borda ulnar da mão, logo proximal à articulação do quinto metacarpo, na transição entre pele palmar e dorsal.",
    rationale: "Tradicionalmente empregado em tensão de mão, braço, nuca e coluna posterior.",
    technique: "Pressão curta e confortável com o polegar, sem pinçar a articulação.",
    duration: "30 segundos, 2 ciclos por lado.",
    cautions: ["Evitar em trauma da mão ou artrite inflamada."],
    view: "back", x: 12, y: 54, bilateral: true,
  },
  SI9: {
    code: "SI9", pinyin: "Jiānzhēn", portuguese: "Ombro Verdadeiro", meridian: "SI",
    location: "Parte posterior do ombro, cerca de um B-cun acima da extremidade da prega axilar posterior, com o braço junto ao corpo.",
    rationale: "Usado tradicionalmente em tensão muscular da região posterior do ombro.",
    technique: "Pressão ampla, leve a moderada, sem buscar profundidade.",
    duration: "30–45 segundos, 2 ciclos por lado.",
    cautions: ["Não usar após trauma, cirurgia, luxação ou perda de força no braço."],
    view: "back", x: 29, y: 30, bilateral: true,
  },
  ST6: {
    code: "ST6", pinyin: "Jiáchē", portuguese: "Carro da Mandíbula", meridian: "ST",
    location: "Sobre o músculo masseter, próximo ao ângulo da mandíbula, onde há maior saliência ao cerrar suavemente os dentes.",
    rationale: "Tradicionalmente relacionado a tensão da mandíbula e face.",
    technique: "Massagem circular muito leve, com a mandíbula relaxada.",
    duration: "20–30 segundos, 2 ciclos por lado.",
    cautions: ["Não pressionar se houver trauma facial, infecção dentária, edema ou dor inexplicada intensa."],
    view: "front", x: 43, y: 12, bilateral: true,
  },
  ST7: {
    code: "ST7", pinyin: "Xiàguān", portuguese: "Barreira Inferior", meridian: "ST",
    location: "Em uma depressão abaixo do arco zigomático, à frente da articulação da mandíbula.",
    rationale: "Usado tradicionalmente em tensão da articulação temporomandibular e face.",
    technique: "Toque leve, sem comprimir a articulação e sem abrir a boca à força.",
    duration: "20 segundos, 2 ciclos por lado.",
    cautions: ["Evitar se a mandíbula estiver travada, após trauma ou com suspeita de infecção odontológica."],
    view: "front", x: 42, y: 10, bilateral: true,
  },
  ST35: {
    code: "ST35", pinyin: "Dúbí", portuguese: "Nariz da Panturrilha", meridian: "ST",
    location: "Face anterior do joelho, em depressão lateral ao ligamento patelar.",
    rationale: "Tradicionalmente associado ao conforto e mobilidade da região anterior do joelho.",
    technique: "Contato leve ao redor da depressão, sem pressionar a patela.",
    duration: "30 segundos, 2 ciclos por lado.",
    cautions: ["Não usar em joelho quente, muito inchado, após trauma ou com suspeita de trombose."],
    view: "front", x: 42, y: 67, bilateral: true,
  },
  ST36: {
    code: "ST36", pinyin: "Zúsānlǐ", portuguese: "Três Milhas da Perna", meridian: "ST",
    location: "Face anterolateral da perna, cerca de três B-cun abaixo de ST35 e lateral à crista da tíbia.",
    rationale: "Ponto tradicionalmente usado para suporte geral e desconfortos de joelho e perna.",
    technique: "Pressão gradual sobre o músculo, nunca diretamente sobre a crista óssea.",
    duration: "45–60 segundos, 2 ciclos por lado.",
    cautions: ["Evitar em edema importante, vermelhidão, dor vascular ou suspeita de trombose."],
    view: "front", x: 41, y: 73, bilateral: true,
  },
  SP6: {
    code: "SP6", pinyin: "Sānyīnjiāo", portuguese: "Encontro dos Três Yin", meridian: "SP",
    location: "Face medial da perna, três B-cun acima do maléolo medial, próximo à borda posterior da tíbia.",
    rationale: "Tradicionalmente relacionado ao relaxamento da perna e a funções dos meridianos Yin inferiores.",
    technique: "Pressão confortável e superficial, evitando a borda óssea.",
    duration: "30–45 segundos, 2 ciclos por lado.",
    cautions: ["Não usar durante a gravidez sem liberação profissional.", "Evitar em suspeita de trombose, edema unilateral ou dor vascular."],
    view: "front", x: 46, y: 79, bilateral: true,
  },
  SP9: {
    code: "SP9", pinyin: "Yīnlíngquán", portuguese: "Fonte da Colina Yin", meridian: "SP",
    location: "Face medial da perna, em depressão posterior e inferior ao côndilo medial da tíbia.",
    rationale: "Tradicionalmente usado em desconforto medial do joelho e sensação de peso nas pernas.",
    technique: "Pressão moderada no tecido macio, sem comprimir a articulação.",
    duration: "30–45 segundos, 2 ciclos por lado.",
    cautions: ["Evitar em inflamação aguda, edema importante ou suspeita de lesão ligamentar."],
    view: "front", x: 47, y: 68, bilateral: true,
  },
  GB20: {
    code: "GB20", pinyin: "Fēngchí", portuguese: "Lago do Vento", meridian: "GB",
    location: "Na base do crânio, em depressão entre os músculos esternocleidomastoideo e trapézio.",
    rationale: "Tradicionalmente relacionado a tensão de nuca e desconfortos de cabeça.",
    technique: "Pressão muito suave para cima e para dentro, sem comprimir a frente ou as laterais do pescoço.",
    duration: "20–30 segundos, 2 ciclos.",
    cautions: ["Evitar em tontura inexplicada, trauma cervical, febre com rigidez de nuca ou doença vascular conhecida."],
    view: "back", x: 44, y: 14, bilateral: true,
  },
  GB21: {
    code: "GB21", pinyin: "Jiānjǐng", portuguese: "Poço do Ombro", meridian: "GB",
    location: "No topo do ombro, aproximadamente no ponto médio entre C7 e a extremidade do acrômio.",
    rationale: "Tradicionalmente empregado para tensão do trapézio e ombros.",
    technique: "Compressão ampla e leve do músculo; nunca pressione diretamente a coluna cervical.",
    duration: "20–30 segundos, 2 ciclos por lado.",
    cautions: ["Não usar durante a gravidez sem liberação profissional.", "Evitar após trauma cervical ou com sintomas neurológicos."],
    view: "back", x: 35, y: 23, bilateral: true,
  },
  GB34: {
    code: "GB34", pinyin: "Yánglíngquán", portuguese: "Fonte da Colina Yang", meridian: "GB",
    location: "Face lateral da perna, em depressão anterior e inferior à cabeça da fíbula.",
    rationale: "Tradicionalmente relacionado a tensão muscular e desconfortos de joelho, quadril e lateral da perna.",
    technique: "Pressão gradual ao redor da depressão, sem comprimir o nervo fibular.",
    duration: "30–45 segundos, 2 ciclos por lado.",
    cautions: ["Interromper imediatamente se houver choque, dormência ou irradiação para o pé."],
    view: "front", x: 36, y: 69, bilateral: true,
  },
  LR3: {
    code: "LR3", pinyin: "Tàichōng", portuguese: "Grande Impulso", meridian: "LR",
    location: "Dorso do pé, entre o primeiro e o segundo metatarsos, proximal às articulações dos dedos.",
    rationale: "Tradicionalmente empregado em tensão de pé e em protocolos gerais de relaxamento.",
    technique: "Pressão leve a moderada no espaço entre os ossos, sem causar dor aguda.",
    duration: "30–45 segundos, 2 ciclos por lado.",
    cautions: ["Evitar em fratura, crise de gota, inflamação ou ferida no pé."],
    view: "front", x: 43, y: 94, bilateral: true,
  },
  KI3: {
    code: "KI3", pinyin: "Tàixī", portuguese: "Grande Riacho", meridian: "KI",
    location: "Em depressão entre o maléolo medial e o tendão de Aquiles.",
    rationale: "Tradicionalmente relacionado ao conforto de tornozelo, perna e região lombar.",
    technique: "Pressão suave na depressão, sem comprimir o tendão.",
    duration: "30–45 segundos, 2 ciclos por lado.",
    cautions: ["Evitar em lesão do tendão, entorse recente, edema ou dor vascular."],
    view: "back", x: 45, y: 91, bilateral: true,
  },
  BL23: {
    code: "BL23", pinyin: "Shènshū", portuguese: "Transporte do Rim", meridian: "BL",
    location: "Região lombar, cerca de 1,5 B-cun lateral à margem inferior do processo espinhoso de L2.",
    rationale: "Tradicionalmente empregado em protocolos para tensão e desconforto lombar.",
    technique: "Massagem ampla, superficial e confortável ao lado da coluna; não pressionar as vértebras.",
    duration: "30–45 segundos, 2 ciclos por lado.",
    cautions: ["Evitar pressão profunda, dor renal suspeita, trauma, osteoporose avançada ou cirurgia recente."],
    view: "back", x: 42, y: 48, bilateral: true,
  },
  BL40: {
    code: "BL40", pinyin: "Wěizhōng", portuguese: "Centro da Curva", meridian: "BL",
    location: "Centro da prega posterior do joelho.",
    rationale: "Tradicionalmente associado a desconfortos da cadeia posterior e região lombar.",
    technique: "Contato leve e breve, sem pressão profunda sobre vasos e nervos.",
    duration: "20–30 segundos, 2 ciclos por lado.",
    cautions: ["Não usar em varizes dolorosas, edema, suspeita de trombose, cisto ou inflamação no joelho."],
    view: "back", x: 43, y: 68, bilateral: true,
  },
  BL60: {
    code: "BL60", pinyin: "Kūnlún", portuguese: "Kunlun", meridian: "BL",
    location: "Em depressão entre o maléolo lateral e o tendão de Aquiles.",
    rationale: "Tradicionalmente relacionado a desconfortos de tornozelo, pé e cadeia posterior.",
    technique: "Pressão suave, sem pinçar ou comprimir o tendão.",
    duration: "30 segundos, 2 ciclos por lado.",
    cautions: ["Não usar durante a gravidez sem liberação profissional.", "Evitar em entorse, edema ou lesão do tendão."],
    view: "back", x: 42, y: 91, bilateral: true,
  },
  LU7: {
    code: "LU7", pinyin: "Lièquē", portuguese: "Sequência Quebrada", meridian: "LU",
    location: "Face radial do antebraço, proximal ao processo estiloide do rádio, cerca de 1,5 B-cun acima da prega do punho.",
    rationale: "Tradicionalmente relacionado a desconfortos de punho, antebraço, cabeça e nuca.",
    technique: "Pressão leve, evitando comprimir a artéria radial.",
    duration: "30 segundos, 2 ciclos por lado.",
    cautions: ["Evitar sobre pulso arterial doloroso, hematoma, edema ou lesão local."],
    view: "front", x: 18, y: 50, bilateral: true,
  },
};

export const protocols: Record<string, RegionProtocol> = {
  cabeca: { label: "Cabeça", objective: "Relaxamento de tensão de cabeça e nuca", points: ["GB20", "LI4", "TE5"] },
  mandibula: { label: "Mandíbula e face", objective: "Relaxamento suave da musculatura facial e mandibular", points: ["ST6", "ST7", "LI4"] },
  pescoco: { label: "Pescoço e nuca", objective: "Redução de tensão superficial na nuca e membro superior", points: ["GB20", "SI3", "LU7"] },
  ombro: { label: "Ombro", objective: "Relaxamento da cintura escapular sem mobilização forçada", points: ["LI15", "SI9", "GB21"] },
  braco: { label: "Braço e cotovelo", objective: "Relaxamento do braço e antebraço", points: ["LI10", "TE5", "LI4"] },
  punho: { label: "Punho e mão", objective: "Relaxamento de punho, palma e antebraço", points: ["PC6", "LI4", "PC8"] },
  torax: { label: "Tórax", objective: "Avaliação profissional antes de qualquer protocolo", points: [], professionalReview: true },
  abdomen: { label: "Abdômen", objective: "Avaliação profissional antes de qualquer protocolo", points: [], professionalReview: true },
  lombar: { label: "Lombar", objective: "Relaxamento superficial da musculatura lombar e cadeia posterior", points: ["BL23", "BL40", "KI3"] },
  quadril: { label: "Quadril", objective: "Relaxamento indireto da cadeia lateral e posterior", points: ["GB34", "BL40", "LR3"] },
  joelho: { label: "Joelho", objective: "Conforto periarticular sem pressão sobre a patela", points: ["ST35", "ST36", "SP9", "GB34"] },
  perna: { label: "Perna", objective: "Relaxamento muscular da perna", points: ["ST36", "GB34", "SP6"] },
  tornozelo: { label: "Tornozelo e pé", objective: "Relaxamento do tornozelo e dorso do pé", points: ["KI3", "BL60", "LR3"] },
  pelve: { label: "Pelve ou região íntima", objective: "Avaliação profissional presencial antes de qualquer protocolo", points: [], professionalReview: true },
};

export const fullCatalog = meridians.flatMap((meridian) =>
  Array.from({ length: meridian.count }, (_, index) => {
    const code = `${meridian.code}${index + 1}`;
    return {
      code,
      meridian,
      record: curatedPoints[code] ?? null,
    };
  }),
);

export const standardPointCount = meridians.reduce((total, meridian) => total + meridian.count, 0);


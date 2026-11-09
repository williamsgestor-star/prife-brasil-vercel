import type { LegalIdentity } from "./legal-identity";

// Textos da Política de Privacidade e dos Termos de uso (PT/ES/EN).
// Revisão jurídica recomendada antes de mudanças grandes. Última atualização: 08/11/2026.
export type LegalLanguage = "pt" | "es" | "en";
export type LegalSection = [title: string, text: string];
export type LegalCopy = { label: string; title: string; intro: string; updated: string; sections: LegalSection[]; back: string; other: string; otherHref: string };

export const LEGAL_UPDATED_AT = "08/11/2026";
export const TERMS_VERSION = "termos-2026-11-08";
export const PRIVACY_VERSION = "privacidade-2026-11-08";

function contactLine(identity: LegalIdentity, language: LegalLanguage) {
  const parts = [identity.email, `WhatsApp +${identity.whatsapp}`].filter(Boolean).join(" · ");
  return {
    pt: `${identity.ownerName} (${identity.businessName}) — ${parts}`,
    es: `${identity.ownerName} (${identity.businessName}) — ${parts}`,
    en: `${identity.ownerName} (${identity.businessName}) — ${parts}`,
  }[language];
}

function responsible(identity: LegalIdentity, language: LegalLanguage) {
  if (identity.isPrimary) {
    return {
      pt: `O site principal ${identity.host} é de responsabilidade de ${identity.ownerName}, distribuidor independente PRIFE, que também administra a plataforma Prife Brasil (subdomínios, painel, CRM e Prospector). Cada subdomínio (nome.prife-brasil.com) é de responsabilidade do distribuidor identificado nele. Este não é o site oficial da Prife International.`,
      es: `El sitio principal ${identity.host} es responsabilidad de ${identity.ownerName}, distribuidor independiente PRIFE, que también administra la plataforma Prife Brasil (subdominios, panel, CRM y Prospector). Cada subdominio (nombre.prife-brasil.com) es responsabilidad del distribuidor identificado en él. Este no es el sitio oficial de Prife International.`,
      en: `The main website ${identity.host} is the responsibility of ${identity.ownerName}, an independent PRIFE distributor, who also runs the Prife Brasil platform (subdomains, panel, CRM and Prospector). Each subdomain (name.prife-brasil.com) is the responsibility of the distributor named on it. This is not the official Prife International website.`,
    }[language];
  }
  return {
    pt: `Este site (${identity.host}) é de responsabilidade de ${identity.ownerName} (${identity.businessName}), distribuidor independente PRIFE, que decide como usa os contatos recebidos. A plataforma Prife Brasil, administrada por Williams Costa Leite, fornece a hospedagem, o painel, o CRM e o Prospector e trata esses dados como operadora, seguindo as instruções do distribuidor. Este não é o site oficial da Prife International.`,
    es: `Este sitio (${identity.host}) es responsabilidad de ${identity.ownerName} (${identity.businessName}), distribuidor independiente PRIFE, que decide cómo usa los contactos recibidos. La plataforma Prife Brasil, administrada por Williams Costa Leite, proporciona el alojamiento, el panel, el CRM y el Prospector y trata esos datos como encargada, siguiendo las instrucciones del distribuidor. Este no es el sitio oficial de Prife International.`,
    en: `This website (${identity.host}) is the responsibility of ${identity.ownerName} (${identity.businessName}), an independent PRIFE distributor, who decides how the contacts received are used. The Prife Brasil platform, run by Williams Costa Leite, provides hosting, the panel, the CRM and the Prospector and processes this data as a processor, following the distributor's instructions. This is not the official Prife International website.`,
  }[language];
}

export function privacyCopy(identity: LegalIdentity, language: LegalLanguage): LegalCopy {
  const contact = contactLine(identity, language);
  const who = responsible(identity, language);
  const copies: Record<LegalLanguage, LegalCopy> = {
    pt: {
      label: "PRIVACIDADE E SEGURANÇA", title: "Política de Privacidade",
      intro: "Esta política explica, de forma simples, como o site Prife Brasil e seus subdomínios tratam dados pessoais, conforme a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018).",
      updated: `Última atualização: ${LEGAL_UPDATED_AT}.`,
      sections: [
        ["1. Quem é o responsável", who],
        ["2. Dados que tratamos", "Visitantes: mensagens digitadas no assistente iTERA, preferências (idioma e escolha de cookies) e dados técnicos básicos de acesso. Quando você clica para conversar pelo WhatsApp, a conversa acontece no aplicativo da Meta, fora deste site.\nDistribuidores com acesso ao painel: nome, e-mail, nome do negócio, subdomínio, dados do perfil público, registros de pagamento da mensalidade, indicações informadas e o registro do aceite destes termos.\nCRM e Prospector: dados comerciais de empresas (nome da empresa, segmento, telefone, endereço, site e redes sociais) vindos de fontes públicas ou importados pelo próprio distribuidor, além das anotações feitas por ele."],
        ["3. Para que usamos e com qual base legal", "Atendimento a quem nos procura (procedimentos preliminares a um contrato, art. 7º, V); criação e gestão das contas, subdomínios e mensalidades (execução de contrato, art. 7º, V); segurança e prevenção a fraude (legítimo interesse, art. 7º, IX); prospecção comercial entre empresas no CRM e no Prospector (legítimo interesse, art. 7º, IX, com direito de oposição a qualquer momento); métricas do Google Analytics e envio de novidades (somente com o seu consentimento, art. 7º, I). Coletamos só o necessário para cada finalidade."],
        ["4. CRM, Prospector e pedido para não ser contatado", "O Prospector busca empresas em fontes públicas (Microsoft Azure Maps e OpenStreetMap) e grava os resultados no CRM do distribuidor que fez a busca. As mensagens são enviadas pelo próprio distribuidor, pelo WhatsApp, e devem respeitar quem não quer ser contatado. Se você pedir para não receber mais contatos, o número é colocado numa lista de bloqueio daquele distribuidor e não volta a ser importado pelo Prospector. Para pedir, responda à mensagem recebida ou use o contato do item 11."],
        ["5. Fornecedores e transferência internacional", "Usamos apenas fornecedores necessários: Vercel (hospedagem do site), Supabase (banco de dados, login e envio dos e-mails com código de acesso), Daily (salas de reunião por vídeo), Groq e Vercel AI Gateway (respostas com inteligência artificial do assistente iTERA e do Copiloto do CRM), Google Analytics (métricas, só depois do seu \"Aceitar\"), Microsoft Azure Maps e OpenStreetMap (buscas do Prospector), WhatsApp/Meta (quando você escolhe conversar por lá) e YouTube/Vimeo (vídeos incorporados, em modo de privacidade). Alguns ficam fora do Brasil; a transferência segue o art. 33 da LGPD. Não vendemos dados pessoais."],
        ["6. Assistente com inteligência artificial", "As perguntas digitadas no assistente iTERA são enviadas a um provedor de IA para gerar a resposta e ficam guardadas junto a um código de sessão anônimo, para manter o contexto da conversa e melhorar as respostas. Não digite dados de saúde, documentos, senhas ou dados de outras pessoas. As respostas são informativas e não substituem orientação médica ou profissional."],
        ["7. Cookies e armazenamento no navegador", "Usamos armazenamento técnico necessário para o site funcionar: idioma, sessão de login, sessão do assistente e a sua escolha sobre cookies. O Google Analytics só é carregado depois que você clica em \"Aceitar\" no aviso de cookies; se clicar em \"Recusar\", nenhuma métrica é coletada. Você pode mudar a escolha a qualquer momento pelo link \"Cookies\" no rodapé."],
        ["8. Por quanto tempo guardamos", "Contatos e leads que não viraram negócio: apagados em até 12 meses após o último contato. Mensagens do assistente iTERA: até 12 meses. Dados de distribuidores e clientes: enquanto durar a relação e, depois, pelos prazos legais (em geral 5 anos). Registro de aceite dos termos: enquanto a conta existir e por até 5 anos depois, como prova. Lista de bloqueio: enquanto for necessária para respeitar o pedido de não contato (guardamos só o telefone em formato codificado)."],
        ["9. Segurança e incidentes", "Usamos conexão segura (HTTPS), controle de acesso por conta, separação de dados por empresa no banco de dados e acesso restrito às chaves dos sistemas. Se acontecer um incidente de segurança que possa causar risco ou dano relevante, comunicaremos a Autoridade Nacional de Proteção de Dados (ANPD) e as pessoas afetadas no prazo da Resolução CD/ANPD nº 15/2024, explicando o que aconteceu e o que foi feito."],
        ["10. Seus direitos", "Você pode pedir, a qualquer momento: confirmação de que tratamos seus dados, acesso, correção, anonimização ou exclusão de dados desnecessários, portabilidade, informação sobre com quem compartilhamos, oposição à prospecção, revogação do consentimento e revisão de decisões automatizadas (art. 18 da LGPD). Você também pode reclamar à ANPD (www.gov.br/anpd)."],
        ["11. Contato e encarregado", `Para exercer seus direitos ou tirar dúvidas sobre privacidade, fale com o responsável por este site: ${contact}. Informe que o pedido é sobre privacidade. Respondemos em até 15 dias. Pedidos sobre a plataforma Prife Brasil também podem ser feitos ao administrador, Williams Costa Leite, pelos contatos do site principal www.prife-brasil.com.`],
        ["12. Menores de idade", "Este site é destinado a maiores de 18 anos e não coleta, de propósito, dados de crianças ou adolescentes."],
        ["13. Mudanças nesta política", "Esta política pode ser atualizada. A data da última atualização fica sempre no topo desta página."],
      ],
      back: "Voltar ao site", other: "Termos de uso", otherHref: "/termos",
    },
    es: {
      label: "PRIVACIDAD Y SEGURIDAD", title: "Política de Privacidad",
      intro: "Esta política explica, de forma sencilla, cómo el sitio Prife Brasil y sus subdominios tratan datos personales, de acuerdo con la Ley General de Protección de Datos de Brasil (LGPD, Ley nº 13.709/2018) y la legislación aplicable.",
      updated: `Última actualización: ${LEGAL_UPDATED_AT}.`,
      sections: [
        ["1. Responsable", who],
        ["2. Datos que tratamos", "Visitantes: mensajes escritos en el asistente iTERA, preferencias (idioma y elección de cookies) y datos técnicos básicos de acceso. Cuando usted hace clic para conversar por WhatsApp, la conversación ocurre en la aplicación de Meta, fuera de este sitio.\nDistribuidores con acceso al panel: nombre, correo, nombre del negocio, subdominio, datos del perfil público, registros de pago de la mensualidad, recomendaciones informadas y el registro de aceptación de estos términos.\nCRM y Prospector: datos comerciales de empresas (nombre, rubro, teléfono, dirección, sitio y redes sociales) obtenidos de fuentes públicas o importados por el propio distribuidor, además de sus anotaciones."],
        ["3. Para qué los usamos y con qué base legal", "Atención a quien nos contacta (procedimientos previos a un contrato); creación y gestión de cuentas, subdominios y mensualidades (ejecución de contrato); seguridad y prevención de fraude (interés legítimo); prospección comercial entre empresas en el CRM y el Prospector (interés legítimo, con derecho de oposición en cualquier momento); métricas de Google Analytics y envío de novedades (solo con su consentimiento). Recopilamos solo lo necesario para cada finalidad."],
        ["4. CRM, Prospector y solicitud de no contacto", "El Prospector busca empresas en fuentes públicas (Microsoft Azure Maps y OpenStreetMap) y guarda los resultados en el CRM del distribuidor que hizo la búsqueda. Los mensajes los envía el propio distribuidor por WhatsApp y deben respetar a quien no quiere ser contactado. Si usted pide no recibir más contactos, el número entra en una lista de bloqueo de ese distribuidor y no vuelve a importarse por el Prospector. Para pedirlo, responda el mensaje recibido o use el contacto del punto 11."],
        ["5. Proveedores y transferencia internacional", "Usamos solo proveedores necesarios: Vercel (alojamiento), Supabase (base de datos, inicio de sesión y envío de correos con código de acceso), Daily (salas de reunión por video), Groq y Vercel AI Gateway (respuestas con inteligencia artificial del asistente iTERA y del Copiloto del CRM), Google Analytics (métricas, solo después de \"Aceptar\"), Microsoft Azure Maps y OpenStreetMap (búsquedas del Prospector), WhatsApp/Meta (cuando usted elige conversar allí) y YouTube/Vimeo (videos incrustados, en modo de privacidad). Algunos están fuera de Brasil. No vendemos datos personales."],
        ["6. Asistente con inteligencia artificial", "Las preguntas escritas en el asistente iTERA se envían a un proveedor de IA para generar la respuesta y se guardan junto a un código de sesión anónimo, para mantener el contexto y mejorar las respuestas. No escriba datos de salud, documentos, contraseñas ni datos de otras personas. Las respuestas son informativas y no sustituyen la orientación médica o profesional."],
        ["7. Cookies y almacenamiento en el navegador", "Usamos almacenamiento técnico necesario para que el sitio funcione: idioma, sesión de inicio, sesión del asistente y su elección sobre cookies. Google Analytics solo se carga después de que usted hace clic en \"Aceptar\" en el aviso de cookies; si hace clic en \"Rechazar\", no se recopila ninguna métrica. Puede cambiar su elección en cualquier momento en el enlace \"Cookies\" del pie de página."],
        ["8. Por cuánto tiempo guardamos", "Contactos y leads que no se convirtieron en negocio: eliminados en hasta 12 meses después del último contacto. Mensajes del asistente iTERA: hasta 12 meses. Datos de distribuidores y clientes: mientras dure la relación y luego por los plazos legales (en general 5 años). Registro de aceptación de los términos: mientras exista la cuenta y hasta 5 años después, como prueba. Lista de bloqueo: mientras sea necesaria para respetar la solicitud (guardamos solo el teléfono en formato codificado)."],
        ["9. Seguridad e incidentes", "Usamos conexión segura (HTTPS), control de acceso por cuenta, separación de datos por empresa en la base de datos y acceso restringido a las claves de los sistemas. Si ocurre un incidente de seguridad que pueda causar riesgo o daño relevante, lo comunicaremos a la Autoridad Nacional de Protección de Datos de Brasil (ANPD) y a las personas afectadas en el plazo de la Resolución CD/ANPD nº 15/2024."],
        ["10. Sus derechos", "Puede solicitar en cualquier momento: confirmación del tratamiento, acceso, corrección, anonimización o eliminación de datos innecesarios, portabilidad, información sobre con quién compartimos, oposición a la prospección, revocación del consentimiento y revisión de decisiones automatizadas (art. 18 de la LGPD). También puede reclamar ante la ANPD."],
        ["11. Contacto y encargado", `Para ejercer sus derechos o resolver dudas sobre privacidad, hable con el responsable de este sitio: ${contact}. Indique que se trata de una solicitud de privacidad. Respondemos en hasta 15 días. Las solicitudes sobre la plataforma Prife Brasil también pueden dirigirse al administrador, Williams Costa Leite, por los contactos del sitio principal www.prife-brasil.com.`],
        ["12. Menores de edad", "Este sitio está destinado a mayores de 18 años y no recopila intencionalmente datos de niños o adolescentes."],
        ["13. Cambios en esta política", "Esta política puede actualizarse. La fecha de la última actualización aparece siempre al inicio de esta página."],
      ],
      back: "Volver al sitio", other: "Términos de uso", otherHref: "/termos",
    },
    en: {
      label: "PRIVACY AND SECURITY", title: "Privacy Policy",
      intro: "This policy explains, in plain language, how the Prife Brasil website and its subdomains process personal data under Brazil's General Data Protection Law (LGPD, Law No. 13,709/2018) and other applicable law.",
      updated: `Last updated: ${LEGAL_UPDATED_AT} (DD/MM/YYYY).`,
      sections: [
        ["1. Who is responsible", who],
        ["2. Data we process", "Visitors: messages typed into the iTERA assistant, preferences (language and cookie choice) and basic technical access data. When you click to chat on WhatsApp, the conversation happens in Meta's app, outside this website.\nDistributors with panel access: name, email, business name, subdomain, public profile data, subscription payment records, referrals entered and the record of acceptance of these terms.\nCRM and Prospector: business data (company name, sector, phone, address, website and social profiles) from public sources or imported by the distributor, plus the distributor's notes."],
        ["3. Purposes and legal bases", "Replying to people who contact us (steps prior to a contract); creating and managing accounts, subdomains and subscriptions (performance of a contract); security and fraud prevention (legitimate interest); business-to-business prospecting in the CRM and Prospector (legitimate interest, with a right to object at any time); Google Analytics metrics and news updates (only with your consent). We collect only what each purpose requires."],
        ["4. CRM, Prospector and do-not-contact requests", "The Prospector searches businesses in public sources (Microsoft Azure Maps and OpenStreetMap) and saves results to the CRM of the distributor who ran the search. Messages are sent by the distributor via WhatsApp and must respect anyone who does not want to be contacted. If you ask not to be contacted again, the number is added to that distributor's block list and will not be imported by the Prospector again. To ask, reply to the message you received or use the contact in section 11."],
        ["5. Providers and international transfers", "We only use providers required for operation: Vercel (hosting), Supabase (database, login and access-code emails), Daily (video meeting rooms), Groq and Vercel AI Gateway (AI replies for the iTERA assistant and the CRM Copilot), Google Analytics (metrics, only after you click \"Accept\"), Microsoft Azure Maps and OpenStreetMap (Prospector searches), WhatsApp/Meta (when you choose to chat there) and YouTube/Vimeo (embedded videos in privacy mode). Some are located outside Brazil. We do not sell personal data."],
        ["6. AI assistant", "Questions typed into the iTERA assistant are sent to an AI provider to generate the reply and are stored with an anonymous session code to keep the conversation context and improve answers. Do not enter health data, documents, passwords or other people's data. Replies are informational and do not replace medical or professional advice."],
        ["7. Cookies and browser storage", "We use technical storage needed for the site to work: language, login session, assistant session and your cookie choice. Google Analytics only loads after you click \"Accept\" in the cookie notice; if you click \"Reject\", no metrics are collected. You can change your choice at any time using the \"Cookies\" link in the footer."],
        ["8. How long we keep data", "Contacts and leads that did not become business: deleted within 12 months of the last contact. iTERA assistant messages: up to 12 months. Distributor and customer data: for the duration of the relationship and then for legal periods (usually 5 years). Terms acceptance records: while the account exists and up to 5 years afterwards, as evidence. Block list: as long as needed to honour the do-not-contact request (only the phone number in encoded form)."],
        ["9. Security and incidents", "We use secure connections (HTTPS), per-account access control, per-company data separation in the database and restricted access to system keys. If a security incident may cause relevant risk or harm, we will notify Brazil's National Data Protection Authority (ANPD) and affected people within the period set by ANPD Resolution No. 15/2024."],
        ["10. Your rights", "You may request at any time: confirmation of processing, access, correction, anonymization or deletion of unnecessary data, portability, information about sharing, objection to prospecting, withdrawal of consent and review of automated decisions (LGPD art. 18). You may also complain to the ANPD."],
        ["11. Contact and data protection officer", `To exercise your rights or ask about privacy, contact the person responsible for this website: ${contact}. Say that your request concerns privacy. We reply within 15 days. Requests about the Prife Brasil platform can also be sent to its administrator, Williams Costa Leite, using the contacts on the main website www.prife-brasil.com.`],
        ["12. Minors", "This website is intended for people aged 18 or over and does not knowingly collect data from children or teenagers."],
        ["13. Changes to this policy", "This policy may be updated. The date of the last update is always shown at the top of this page."],
      ],
      back: "Back to website", other: "Terms of use", otherHref: "/termos",
    },
  };
  return copies[language];
}

export function termsCopy(identity: LegalIdentity, language: LegalLanguage): LegalCopy {
  const contact = contactLine(identity, language);
  const copies: Record<LegalLanguage, LegalCopy> = {
    pt: {
      label: "REGRAS DE USO", title: "Termos de uso",
      intro: "Estes termos explicam as regras para usar o site Prife Brasil, seus subdomínios e as ferramentas da área exclusiva (painel, CRM, Prospector, reuniões e assistente iTERA). Ao usar o site, você concorda com eles.",
      updated: `Última atualização: ${LEGAL_UPDATED_AT}.`,
      sections: [
        ["1. O que é este site", `${responsible(identity, "pt")} O site apresenta as tecnologias de bem-estar PRIFE e a oportunidade de distribuição. Preço, estoque, frete, pagamento e condições de compra são confirmados diretamente com o distribuidor antes de qualquer pedido.`],
        ["2. Informações sobre os produtos", "As tecnologias de bem-estar não são dispositivos médicos e não substituem diagnóstico, tratamento ou acompanhamento de profissionais de saúde. Não existe renda ou resultado garantido na oportunidade de negócio: o desempenho depende de vendas, atividade, custos e regras oficiais da PRIFE."],
        ["3. Uso permitido", "Você pode navegar, consultar as informações e entrar em contato. Não é permitido usar o site para fins ilegais, tentar acessar áreas ou dados de outras pessoas ou empresas, enviar conteúdo ofensivo ou enganoso, copiar o site em massa (robôs) ou atrapalhar o funcionamento dos sistemas."],
        ["4. Área exclusiva para distribuidores", "O acesso ao painel, ao CRM e ao Prospector é individual e liberado pela administração. Quem tem acesso é responsável pela senha e pelo uso que faz das ferramentas, incluindo o conteúdo publicado no seu subdomínio (textos, fotos e vídeos, que devem ser próprios ou autorizados). Os contatos do CRM só podem ser usados para prospecção comercial responsável: sem mensagens em massa não solicitadas, respeitando imediatamente quem pedir para não ser contatado (use o botão \"Não contatar\" do CRM) e sem promessas de cura ou de renda."],
        ["5. Ativação e mensalidade do subdomínio", "Os valores da ativação e dos planos (mensal, semestral ou anual) são informados pela administração antes da contratação, sem taxas escondidas. Não há renovação automática nem cobrança automática: cada período é pago e registrado pela administração, e o site fica bloqueado quando o prazo termina sem novo pagamento. Quem contrata como consumidor pode desistir em até 7 dias da contratação, com devolução integral do valor pago (art. 49 do Código de Defesa do Consumidor). Para cancelar, basta avisar pelo mesmo canal usado na contratação (WhatsApp ou e-mail da administração); o cancelamento vale a partir do aviso."],
        ["6. Propriedade intelectual", "As marcas PRIFE, iTeraCare e demais nomes de produtos pertencem aos seus titulares e são usados apenas para identificar os produtos. Os textos, o layout e o código deste site não podem ser copiados sem autorização. Fotos e vídeos enviados pelos distribuidores são de responsabilidade de quem os enviou."],
        ["7. Links externos e WhatsApp", "O site tem links para o WhatsApp, redes sociais, vídeos e outros sites. Esses serviços têm regras e políticas próprias, e não controlamos o conteúdo deles."],
        ["8. Limitação de responsabilidade", "Trabalhamos para manter o site no ar e as informações corretas, mas podem ocorrer interrupções, falhas ou atualizações. As respostas do assistente iTERA são automáticas e informativas e podem conter erros; confirme sempre com o distribuidor. Não respondemos por decisões tomadas apenas com base no conteúdo do site, nem por serviços de terceiros."],
        ["9. Privacidade", "O tratamento de dados pessoais segue a nossa Política de Privacidade, disponível em /privacidade."],
        ["10. Mudanças e foro", "Estes termos podem ser atualizados, e a data fica sempre no topo da página. Aplica-se a lei brasileira. Fica eleito o foro do domicílio do consumidor; nos demais casos, o foro do domicílio do responsável pelo site."],
        ["11. Contato", `Dúvidas sobre estes termos: ${contact}.`],
      ],
      back: "Voltar ao site", other: "Política de Privacidade", otherHref: "/privacidade",
    },
    es: {
      label: "REGLAS DE USO", title: "Términos de uso",
      intro: "Estos términos explican las reglas para usar el sitio Prife Brasil, sus subdominios y las herramientas del área exclusiva (panel, CRM, Prospector, reuniones y asistente iTERA). Al usar el sitio, usted los acepta.",
      updated: `Última actualización: ${LEGAL_UPDATED_AT}.`,
      sections: [
        ["1. Qué es este sitio", `${responsible(identity, "es")} El sitio presenta las tecnologías de bienestar PRIFE y la oportunidad de distribución. Precio, stock, envío, pago y condiciones de compra se confirman directamente con el distribuidor antes de cualquier pedido.`],
        ["2. Información sobre los productos", "Las tecnologías de bienestar no son dispositivos médicos y no sustituyen diagnóstico, tratamiento ni seguimiento de profesionales de salud. No existen ingresos ni resultados garantizados en la oportunidad de negocio: el desempeño depende de ventas, actividad, costos y reglas oficiales de PRIFE."],
        ["3. Uso permitido", "Puede navegar, consultar la información y ponerse en contacto. No está permitido usar el sitio con fines ilegales, intentar acceder a áreas o datos de otras personas o empresas, enviar contenido ofensivo o engañoso, copiar el sitio de forma masiva (robots) ni perjudicar el funcionamiento de los sistemas."],
        ["4. Área exclusiva para distribuidores", "El acceso al panel, al CRM y al Prospector es individual y lo habilita la administración. Quien tiene acceso es responsable de su contraseña y del uso de las herramientas, incluido el contenido publicado en su subdominio (textos, fotos y videos propios o autorizados). Los contactos del CRM solo pueden usarse para una prospección comercial responsable: sin mensajes masivos no solicitados, respetando de inmediato a quien pida no ser contactado (botón \"No contactar\" del CRM) y sin prometer curas ni ingresos."],
        ["5. Activación y mensualidad del subdominio", "Los valores de activación y de los planes (mensual, semestral o anual) los informa la administración antes de la contratación, sin cargos ocultos. No hay renovación ni cobro automático: cada período se paga y lo registra la administración, y el sitio se bloquea cuando vence el plazo sin un nuevo pago. Quien contrata como consumidor puede desistir dentro de los 7 días de la contratación, con devolución total del valor pagado (art. 49 del Código de Defensa del Consumidor de Brasil). Para cancelar, basta avisar por el mismo canal usado en la contratación (WhatsApp o correo de la administración)."],
        ["6. Propiedad intelectual", "Las marcas PRIFE, iTeraCare y demás nombres de productos pertenecen a sus titulares y se usan solo para identificar los productos. Los textos, el diseño y el código de este sitio no pueden copiarse sin autorización. Las fotos y videos enviados por los distribuidores son responsabilidad de quien los envió."],
        ["7. Enlaces externos y WhatsApp", "El sitio tiene enlaces a WhatsApp, redes sociales, videos y otros sitios. Esos servicios tienen reglas y políticas propias y no controlamos su contenido."],
        ["8. Limitación de responsabilidad", "Trabajamos para mantener el sitio disponible y la información correcta, pero pueden ocurrir interrupciones, fallas o actualizaciones. Las respuestas del asistente iTERA son automáticas e informativas y pueden contener errores; confírmelas siempre con el distribuidor. No respondemos por decisiones tomadas solo con base en el contenido del sitio ni por servicios de terceros."],
        ["9. Privacidad", "El tratamiento de datos personales sigue nuestra Política de Privacidad, disponible en /privacidade."],
        ["10. Cambios y jurisdicción", "Estos términos pueden actualizarse y la fecha aparece siempre al inicio de la página. Se aplica la ley brasileña. Se elige el foro del domicilio del consumidor; en los demás casos, el foro del domicilio del responsable del sitio."],
        ["11. Contacto", `Dudas sobre estos términos: ${contact}.`],
      ],
      back: "Volver al sitio", other: "Política de Privacidad", otherHref: "/privacidade",
    },
    en: {
      label: "TERMS", title: "Terms of use",
      intro: "These terms set out the rules for using the Prife Brasil website, its subdomains and the members-area tools (panel, CRM, Prospector, meetings and the iTERA assistant). By using the website, you agree to them.",
      updated: `Last updated: ${LEGAL_UPDATED_AT} (DD/MM/YYYY).`,
      sections: [
        ["1. What this website is", `${responsible(identity, "en")} The website presents PRIFE wellness technologies and the distribution opportunity. Price, stock, shipping, payment and purchase terms are confirmed directly with the distributor before any order.`],
        ["2. Product information", "Wellness technologies are not medical devices and do not replace diagnosis, treatment or follow-up by health professionals. There is no guaranteed income or result in the business opportunity: performance depends on sales, activity, costs and PRIFE's official rules."],
        ["3. Permitted use", "You may browse, read the information and get in touch. You may not use the website for unlawful purposes, try to access other people's or companies' areas or data, post offensive or misleading content, scrape the website in bulk or disrupt the systems."],
        ["4. Distributor members area", "Access to the panel, CRM and Prospector is individual and granted by the administration. Users are responsible for their password and how they use the tools, including content published on their subdomain (texts, photos and videos must be their own or authorized). CRM contacts may only be used for responsible business prospecting: no unsolicited bulk messages, immediately honouring anyone who asks not to be contacted (use the CRM \"Do not contact\" button) and no promises of cures or income."],
        ["5. Subdomain activation and subscription", "Activation and plan prices (monthly, six-monthly or yearly) are provided by the administration before purchase, with no hidden fees. There is no automatic renewal or automatic charge: each period is paid and recorded by the administration, and the site is blocked when the period ends without a new payment. Consumers may withdraw within 7 days of purchase with a full refund (Brazilian Consumer Code, art. 49). To cancel, simply notify us through the same channel used to purchase (the administration's WhatsApp or email)."],
        ["6. Intellectual property", "PRIFE, iTeraCare and other product names are trademarks of their owners and are used only to identify the products. The texts, layout and code of this website may not be copied without permission. Photos and videos uploaded by distributors are the responsibility of the uploader."],
        ["7. External links and WhatsApp", "The website links to WhatsApp, social networks, videos and other websites. Those services have their own rules and policies, and we do not control their content."],
        ["8. Limitation of liability", "We work to keep the website available and the information accurate, but interruptions, errors or updates may occur. iTERA assistant replies are automatic and informational and may contain mistakes; always confirm with the distributor. We are not liable for decisions based solely on the website's content or for third-party services."],
        ["9. Privacy", "Personal data is processed in accordance with our Privacy Policy, available at /privacidade."],
        ["10. Changes and jurisdiction", "These terms may be updated, and the date is always shown at the top of the page. Brazilian law applies. Consumers may bring claims in their place of residence; otherwise, the courts of the place of residence of the person responsible for the website have jurisdiction."],
        ["11. Contact", `Questions about these terms: ${contact}.`],
      ],
      back: "Back to website", other: "Privacy Policy", otherHref: "/privacidade",
    },
  };
  return copies[language];
}

// Textos exatos das caixas de aceite da solicitação de acesso (gravados como prova do aceite).
export const ACCEPT_TERMS_TEXT = "Li e aceito os Termos de uso e a Política de Privacidade da Prife Brasil.";
export const ACCEPT_MARKETING_TEXT = "Quero receber novidades, materiais e convites da Prife Brasil por e-mail ou WhatsApp (opcional; posso cancelar quando quiser).";

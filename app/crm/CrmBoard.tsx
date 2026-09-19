"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSiteLanguage } from "../lib/site-language";
import styles from "./Crm.module.css";
import { outreachOffers } from "../lib/crm-outreach";
import { parseCsvLeads } from "../lib/csv-leads";

type LeadStatus = "novo" | "whatsapp" | "contatado" | "interessado" | "reuniao" | "proposta" | "cliente" | "perdido";
type Lead = { id:string; company_name:string; segment:string|null; phone:string; whatsapp:string|null; email:string|null; address:string|null; website:string|null; source:string|null; source_url:string|null; status:LeadStatus; notes:string|null; lead_score:number; next_follow_up_at:string|null; social_profiles:Record<string,string>; created_at:string };
type AiMode = "ask" | "outreach" | "objection" | "followup" | "client";
type AiHistory = { id:string; role:"user"|"assistant"; content:string; mode:AiMode; product:string|null; metadata:Record<string,unknown>|null; created_at:string };

const statuses: LeadStatus[] = ["novo", "whatsapp", "contatado", "interessado", "proposta", "cliente"];
const crmCopy = {
  pt:{live:"Sala ao vivo",title:"CRM de",highlight:"Leads",description:"Leads do Prospector entram automaticamente. Organize prioridades, próximos contatos e conversas pelo WhatsApp.",import:"Importar CSV",importing:"Importando…",invalidCsv:"O CSV precisa ter as colunas Nome/Empresa e Telefone/WhatsApp.",emptyCsv:"Nenhum lead válido foi encontrado no arquivo.",importError:"Não foi possível importar. Verifique o arquivo e tente novamente.",search:"Buscar novos leads",loading:"Carregando CRM…",noSegment:"Sem segmento",sent:"lead(s) importado(s) para o CRM.",loadError:"Erro ao carregar.",updateError:"Não foi possível atualizar o lead.",labelUpdateError:"Não foi possível salvar o nome da etapa.",editStage:"Editar nome da etapa",filterPlaceholder:"Buscar por empresa, telefone ou segmento",total:"Total de leads",hot:"Prioridade alta",followUp:"Acompanhamentos",conversion:"Conversão",details:"Detalhes",remove:"Excluir",removing:"Excluindo…",removeConfirm:"Excluir o lead {name}? Esta ação não pode ser desfeita.",removed:"Lead excluído com sucesso.",removeError:"Não foi possível excluir o lead.",score:"Pontuação",nextContact:"Próximo contato",notes:"Anotações",noLeads:"Nenhum lead neste estágio.",status:{novo:"Novo lead",whatsapp:"WhatsApp",contatado:"Contato realizado",interessado:"Interessado",reuniao:"Reunião",proposta:"Proposta",cliente:"Cliente",perdido:"Perdido"}},
  es:{live:"Sala en vivo",title:"CRM de",highlight:"Leads",description:"Los leads del Prospector entran automáticamente. Organiza prioridades, seguimientos y conversaciones por WhatsApp.",import:"Importar CSV",importing:"Importando…",invalidCsv:"El CSV debe tener las columnas Nombre/Empresa y Teléfono/WhatsApp.",emptyCsv:"No se encontraron leads válidos en el archivo.",importError:"No fue posible importar. Revisa el archivo e inténtalo de nuevo.",search:"Buscar nuevos leads",loading:"Cargando CRM…",noSegment:"Sin segmento",sent:"lead(s) importado(s) al CRM.",loadError:"Error al cargar.",updateError:"No fue posible actualizar el lead.",labelUpdateError:"No fue posible guardar el nombre de la etapa.",editStage:"Editar nombre de la etapa",filterPlaceholder:"Buscar por empresa, teléfono o segmento",total:"Total de leads",hot:"Alta prioridad",followUp:"Seguimientos",conversion:"Conversión",details:"Detalles",remove:"Eliminar",removing:"Eliminando…",removeConfirm:"¿Eliminar el lead {name}? Esta acción no se puede deshacer.",removed:"Lead eliminado correctamente.",removeError:"No fue posible eliminar el lead.",score:"Puntuación",nextContact:"Próximo contacto",notes:"Notas",noLeads:"No hay leads en esta etapa.",status:{novo:"Nuevo lead",whatsapp:"WhatsApp",contatado:"Contacto realizado",interessado:"Interesado",reuniao:"Reunión",proposta:"Propuesta",cliente:"Cliente",perdido:"Perdido"}},
  en:{live:"Live room",title:"Lead",highlight:"CRM",description:"Prospector leads arrive automatically. Organize priorities, follow-ups, and WhatsApp conversations.",import:"Import CSV",importing:"Importing…",invalidCsv:"The CSV must include Name/Company and Phone/WhatsApp columns.",emptyCsv:"No valid leads were found in the file.",importError:"Import failed. Check the file and try again.",search:"Find new leads",loading:"Loading CRM…",noSegment:"No segment",sent:"lead(s) imported into the CRM.",loadError:"Loading error.",updateError:"The lead could not be updated.",labelUpdateError:"The stage name could not be saved.",editStage:"Edit stage name",filterPlaceholder:"Search company, phone, or segment",total:"Total leads",hot:"High priority",followUp:"Follow-ups",conversion:"Conversion",details:"Details",remove:"Delete",removing:"Deleting…",removeConfirm:"Delete {name}? This action cannot be undone.",removed:"Lead deleted successfully.",removeError:"The lead could not be deleted.",score:"Score",nextContact:"Next contact",notes:"Notes",noLeads:"No leads in this stage.",status:{novo:"New lead",whatsapp:"WhatsApp",contatado:"Contact made",interessado:"Interested",reuniao:"Meeting",proposta:"Proposal",cliente:"Client",perdido:"Lost"}},
};

const copilotCopy = {
  pt:{
    button:"Copiloto IA", title:"Copiloto IA do CRM",
    description:"Entende o contexto, usa a base de conhecimento do Assistente iTERA e mantém memória separada por lead. Só cria mensagem para o cliente quando você pedir.",
    lead:"Lead", generic:"Conversa geral", product:"Produto em contexto", auto:"Identificar pelo contexto",
    context:"Pergunte à IA ou informe o que aconteceu na conversa", placeholder:"Ex.: ele perguntou como é este aparelho. / O cliente achou caro, o que respondo? / Crie um follow-up curto.",
    send:"Perguntar à IA", sending:"Pensando…", clear:"Limpar memória", clearConfirm:"Limpar a memória desta conversa com a IA?", memory:"Memória da conversa",
    noMemory:"Ainda não há histórico para este lead.", internal:"Resposta para você", client:"Mensagem pronta para o cliente",
    copy:"Copiar mensagem", copied:"Copiado", whatsapp:"Enviar no WhatsApp", transform:"Transformar em mensagem para o cliente",
    modes:{ask:"Perguntar à IA",outreach:"Criar abordagem",objection:"Responder objeção",followup:"Criar follow-up"},
    error:"Não foi possível consultar o Copiloto IA. Tente novamente."
  },
  es:{
    button:"Copiloto IA", title:"Copiloto IA del CRM",
    description:"Entiende el contexto, usa la base del Asistente iTERA y mantiene memoria separada por lead. Solo crea un mensaje para el cliente cuando lo pides.",
    lead:"Lead", generic:"Conversación general", product:"Producto en contexto", auto:"Identificar por el contexto",
    context:"Pregunta a la IA o cuenta qué ocurrió en la conversación", placeholder:"Ej.: preguntó cómo es este aparato. / Le pareció caro, ¿qué respondo? / Crea un seguimiento corto.",
    send:"Preguntar a la IA", sending:"Pensando…", clear:"Borrar memoria", clearConfirm:"¿Borrar la memoria de esta conversación con la IA?", memory:"Memoria de la conversación",
    noMemory:"Todavía no hay historial para este lead.", internal:"Respuesta para ti", client:"Mensaje listo para el cliente",
    copy:"Copiar mensaje", copied:"Copiado", whatsapp:"Enviar por WhatsApp", transform:"Convertir en mensaje para el cliente",
    modes:{ask:"Preguntar a la IA",outreach:"Crear abordaje",objection:"Responder objeción",followup:"Crear seguimiento"},
    error:"No fue posible consultar el Copiloto IA. Inténtalo de nuevo."
  },
  en:{
    button:"AI Copilot", title:"CRM AI Copilot",
    description:"Understands context, uses the iTERA Assistant knowledge base, and keeps separate memory per lead. It only writes a customer message when you ask.",
    lead:"Lead", generic:"General conversation", product:"Product in context", auto:"Detect from context",
    context:"Ask the AI or describe what happened in the conversation", placeholder:"E.g. they asked what this device is. / The customer said it is expensive, what should I say? / Create a short follow-up.",
    send:"Ask AI", sending:"Thinking…", clear:"Clear memory", clearConfirm:"Clear this AI conversation memory?", memory:"Conversation memory",
    noMemory:"No history for this lead yet.", internal:"Answer for you", client:"Customer-ready message",
    copy:"Copy message", copied:"Copied", whatsapp:"Send on WhatsApp", transform:"Turn into a customer message",
    modes:{ask:"Ask AI",outreach:"Create outreach",objection:"Handle objection",followup:"Create follow-up"},
    error:"The AI Copilot could not respond. Please try again."
  },
};

function toDateInput(value:string|null){if(!value)return"";const date=new Date(value);const offset=date.getTimezoneOffset()*60_000;return new Date(date.getTime()-offset).toISOString().slice(0,16)}
function WhatsAppIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.04 2a9.84 9.84 0 0 0-8.4 14.96L2.3 22l5.17-1.36A9.96 9.96 0 1 0 12.04 2Zm0 17.96a8.06 8.06 0 0 1-4.1-1.12l-.3-.18-3.07.8.82-2.98-.2-.31a8.08 8.08 0 1 1 6.85 3.79Zm4.43-6.05c-.24-.12-1.43-.7-1.66-.79-.22-.08-.38-.12-.54.12-.16.25-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2a7.2 7.2 0 0 1-1.34-1.67c-.14-.24-.02-.37.1-.49.11-.1.25-.28.37-.42.12-.14.16-.24.24-.4.08-.17.04-.31-.02-.43-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.55-.41h-.46c-.16 0-.42.06-.64.3-.22.25-.84.83-.84 2.02 0 1.19.87 2.34.99 2.5.12.17 1.7 2.6 4.13 3.65.58.25 1.03.4 1.38.51.58.19 1.1.16 1.52.1.47-.07 1.43-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.47-.28Z"/></svg>}

export default function CrmBoard({userDisplayName,tenantId}:{userDisplayName:string;tenantId:string}){
  const language=useSiteLanguage();const copy=crmCopy[language];const copilot=copilotCopy[language];
  const[leads,setLeads]=useState<Lead[]>([]);const[stageLabels,setStageLabels]=useState<Record<string,string>>({});
  const[loading,setLoading]=useState(true);const[importing,setImporting]=useState(false);const[deletingId,setDeletingId]=useState<string|null>(null);
  const[message,setMessage]=useState("");const[query,setQuery]=useState("");const deferredQuery=useDeferredValue(query);const[expandedId,setExpandedId]=useState<string|null>(null);
  const[coachOpen,setCoachOpen]=useState(false);const[coachLeadId,setCoachLeadId]=useState("");const[coachMode,setCoachMode]=useState<Exclude<AiMode,"client">>("ask");
  const[coachContext,setCoachContext]=useState("");const[coachAnswer,setCoachAnswer]=useState("");const[coachCustomerMessage,setCoachCustomerMessage]=useState("");
  const[coachCopied,setCoachCopied]=useState(false);const[coachOffer,setCoachOffer]=useState("auto");const[coachBusy,setCoachBusy]=useState(false);const[coachError,setCoachError]=useState("");
  const[coachHistory,setCoachHistory]=useState<AiHistory[]>([]);
  const fileRef=useRef<HTMLInputElement>(null);const headers=useMemo(()=>({"x-prife-tenant":tenantId}),[tenantId]);

  async function load(){setLoading(true);const response=await fetch("/api/crm/leads",{headers,cache:"no-store"});const data=await response.json();setLeads(data.leads||[]);setStageLabels(data.stageLabels||{});setMessage(response.ok?"":data.error||copy.loadError);setLoading(false)}
  useEffect(()=>{let active=true;void fetch("/api/crm/leads",{headers,cache:"no-store"}).then(async(response)=>{const data=await response.json();if(!active)return;setLeads(data.leads||[]);setStageLabels(data.stageLabels||{});setMessage(response.ok?"":data.error||copy.loadError);setLoading(false)}).catch(()=>{if(active){setMessage(copy.loadError);setLoading(false)}});return()=>{active=false}},[copy.loadError,headers]);
  async function importFile(file?:File){if(!file)return;setImporting(true);setMessage("");try{const parsed=parseCsvLeads(await file.text());if(parsed.error){setMessage(parsed.error==="headers"?copy.invalidCsv:copy.emptyCsv);return}const response=await fetch("/api/crm/leads",{method:"POST",headers:{...headers,"content-type":"application/json"},body:JSON.stringify({leads:parsed.leads})});const data=await response.json().catch(()=>({error:copy.importError}));setMessage(response.ok?`${data.imported} ${copy.sent}`:data.error||copy.importError);if(response.ok)await load()}catch{setMessage(copy.importError)}finally{setImporting(false);if(fileRef.current)fileRef.current.value=""}}
  async function updateLead(lead:Lead,patch:Partial<Pick<Lead,"status"|"notes"|"lead_score"|"next_follow_up_at">>){setLeads((current)=>current.map((item)=>item.id===lead.id?{...item,...patch}:item));const response=await fetch("/api/crm/leads",{method:"PATCH",headers:{...headers,"content-type":"application/json"},body:JSON.stringify({id:lead.id,...patch})});if(!response.ok){setMessage(copy.updateError);await load()}}
  async function deleteLead(lead:Lead){if(!window.confirm(copy.removeConfirm.replace("{name}",lead.company_name)))return;setDeletingId(lead.id);setMessage("");try{const response=await fetch("/api/crm/leads",{method:"DELETE",headers:{...headers,"content-type":"application/json"},body:JSON.stringify({id:lead.id})});const data=await response.json().catch(()=>({error:copy.removeError}));if(!response.ok){setMessage(data.error||copy.removeError);return}setLeads((current)=>current.filter((item)=>item.id!==lead.id));if(expandedId===lead.id)setExpandedId(null);if(coachLeadId===lead.id)setCoachLeadId("");setMessage(copy.removed)}catch{setMessage(copy.removeError)}finally{setDeletingId(null)}}
  async function saveStageLabels(){const response=await fetch("/api/crm/leads",{method:"PUT",headers:{...headers,"content-type":"application/json"},body:JSON.stringify({stage_labels:stageLabels})});const data=await response.json();if(response.ok){setStageLabels(data.stageLabels||{});setMessage("")}else setMessage(data.error||copy.labelUpdateError)}

  async function loadCoachHistory(leadId=coachLeadId){try{const suffix=leadId?`?leadId=${encodeURIComponent(leadId)}`:"";const response=await fetch(`/api/crm/assistant${suffix}`,{headers,cache:"no-store"});const data=await response.json();setCoachHistory(response.ok?data.messages||[]:[])}catch{setCoachHistory([])}}
  async function openCopilot(leadId=""){setCoachLeadId(leadId);setCoachOpen(true);setCoachError("");setCoachAnswer("");setCoachCustomerMessage("");setCoachCopied(false);await loadCoachHistory(leadId)}
  async function runCopilot(mode:AiMode=coachMode){
    const text=coachContext.trim()||(mode==="client"?coachAnswer.trim():"");if(!text)return;
    setCoachBusy(true);setCoachError("");setCoachCopied(false);
    try{
      const response=await fetch("/api/crm/assistant",{method:"POST",headers:{...headers,"content-type":"application/json"},body:JSON.stringify({leadId:coachLeadId,mode,product:coachOffer,message:text,language})});
      const data=await response.json();
      if(!response.ok){setCoachError(data.error||copilot.error);return}
      setCoachAnswer(data.answer||"");setCoachCustomerMessage(data.customerMessage||"");
      if(mode!=="client")setCoachContext("");
      await loadCoachHistory(coachLeadId);
    }catch{setCoachError(copilot.error)}finally{setCoachBusy(false)}
  }
  async function clearCoachMemory(){if(!window.confirm(copilot.clearConfirm))return;setCoachBusy(true);try{const response=await fetch("/api/crm/assistant",{method:"DELETE",headers:{...headers,"content-type":"application/json"},body:JSON.stringify({leadId:coachLeadId})});if(response.ok){setCoachHistory([]);setCoachAnswer("");setCoachCustomerMessage("");setCoachContext("")}}finally{setCoachBusy(false)}}
  async function copyCoachMessage(){if(!coachCustomerMessage)return;await navigator.clipboard.writeText(coachCustomerMessage);setCoachCopied(true)}

  const coachLead=leads.find((lead)=>lead.id===coachLeadId);
  const coachPhone=(coachLead?.whatsapp||coachLead?.phone||"").replace(/\D/g,"");
  const coachWhatsAppUrl=coachPhone&&coachCustomerMessage?`https://wa.me/${coachPhone}?text=${encodeURIComponent(coachCustomerMessage)}`:"";
  const filteredLeads=useMemo(()=>{const normalizedQuery=deferredQuery.trim().toLocaleLowerCase();return leads.filter((lead)=>{if(!normalizedQuery)return true;return[lead.company_name,lead.phone,lead.segment,lead.email].some((value)=>value?.toLocaleLowerCase().includes(normalizedQuery))})},[deferredQuery,leads]);
  const grouped=useMemo(()=>{const map=new Map<LeadStatus,Lead[]>(statuses.map((status)=>[status,[]]));for(const lead of filteredLeads)(map.get(lead.status)??map.get("novo"))?.push(lead);return map},[filteredLeads]);
  const metrics=useMemo(()=>{let hot=0;let followUps=0;let clients=0;for(const lead of leads){if(lead.lead_score>=70)hot+=1;if(lead.next_follow_up_at)followUps+=1;if(lead.status==="cliente")clients+=1}return{hot,followUps,conversion:leads.length?Math.round(clients/leads.length*100):0}},[leads]);

  return <main className={styles.page}>
    <header className={styles.header}><Link href="/"><img src="/brand/prife-brasil-original.png" alt="Prife Brasil"/></Link><nav><Link href="/leads">Prospector</Link><Link href="/reuniao">{copy.live}</Link><Link href="/ponto-vivo">PontoVivo</Link><a href="/auth/signout">Sair</a></nav></header>
    <section className={styles.hero}><div><small>ÁREA EXCLUSIVA • {userDisplayName}</small><h1>{copy.title} <em>{copy.highlight}</em></h1><p>{copy.description}</p></div><div className={styles.actions}><button className={styles.aiButton} onClick={()=>void openCopilot()}>{copilot.button}</button><button type="button" disabled={importing} onClick={()=>fileRef.current?.click()}>{importing?copy.importing:copy.import}</button><a href="https://convertio.co/pt/conversor-csv/" target="_blank" rel="noopener noreferrer">{language==="es"?"Convertir a CSV":language==="en"?"Convert to CSV":"Converter para CSV"}</a><a href="/leads">{copy.search}</a><input ref={fileRef} type="file" accept=".csv,text/csv,text/plain,application/vnd.ms-excel" onClick={(event)=>{event.currentTarget.value=""}} onChange={(event)=>void importFile(event.target.files?.[0])} hidden/></div></section>
    <section className={styles.metrics} aria-label="Resumo do CRM"><article><small>{copy.total}</small><strong>{leads.length}</strong></article><article><small>{copy.hot}</small><strong>{metrics.hot}</strong></article><article><small>{copy.followUp}</small><strong>{metrics.followUps}</strong></article><article><small>{copy.conversion}</small><strong>{metrics.conversion}%</strong></article></section>
    <section className={styles.toolbar}><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder={copy.filterPlaceholder} aria-label={copy.filterPlaceholder}/></section>
    {message?<p className={styles.notice} role="status" aria-live="polite">{message}</p>:null}
    <section className={styles.board} tabIndex={0} aria-label={copy.title+" "+copy.highlight}>
      {loading?<p>{copy.loading}</p>:statuses.map((status)=>{
        const stageLeads=grouped.get(status)||[];
        return <article className={styles.column} key={status}>
          <header><input aria-label={`${copy.editStage}: ${copy.status[status]}`} title={copy.editStage} maxLength={40} value={stageLabels[status]??copy.status[status]} onChange={(event)=>setStageLabels((current)=>({...current,[status]:event.target.value}))} onBlur={()=>void saveStageLabels()} onKeyDown={(event)=>{if(event.key==="Enter")event.currentTarget.blur()}}/><span>{stageLeads.length}</span></header>
          {!stageLeads.length?<p className={styles.emptyColumn}>{copy.noLeads}</p>:null}
          {stageLeads.map((lead)=><div className={styles.card} key={lead.id}>
            <div className={styles.cardTop}><small>{lead.segment||copy.noSegment}</small><b>{lead.lead_score}</b></div>
            <h2>{lead.company_name}</h2>
            <a href={`https://wa.me/${(lead.whatsapp||lead.phone).replace(/\D/g,"")}`} target="_blank" rel="noreferrer" onClick={()=>{if(lead.status==="novo")void updateLead(lead,{status:"whatsapp"})}}>WhatsApp: {lead.phone}</a>
            {lead.address?<p>{lead.address}</p>:null}
            <select value={statuses.includes(lead.status)?lead.status:"novo"} onChange={(event)=>void updateLead(lead,{status:event.target.value as LeadStatus})}>{statuses.map((item)=><option value={item} key={item}>{stageLabels[item]??copy.status[item]}</option>)}</select>
            <div className={styles.cardActions}>
              <button className={styles.detailsButton} type="button" onClick={()=>setExpandedId((current)=>current===lead.id?null:lead.id)}>{copy.details}</button>
              <button className={styles.aiCardButton} type="button" onClick={()=>void openCopilot(lead.id)}>{copilot.button}</button>
              <button className={styles.deleteButton} type="button" disabled={deletingId===lead.id} onClick={()=>void deleteLead(lead)} aria-label={`${copy.remove}: ${lead.company_name}`}>{deletingId===lead.id?copy.removing:copy.remove}</button>
            </div>
            {expandedId===lead.id?<div className={styles.detailsPanel}><label><span>{copy.score}</span><input type="number" min="0" max="100" value={lead.lead_score} onChange={(event)=>setLeads((current)=>current.map((item)=>item.id===lead.id?{...item,lead_score:Number(event.target.value)}:item))} onBlur={(event)=>void updateLead(lead,{lead_score:Number(event.currentTarget.value)})}/></label><label><span>{copy.nextContact}</span><input type="datetime-local" value={toDateInput(lead.next_follow_up_at)} onChange={(event)=>void updateLead(lead,{next_follow_up_at:event.target.value?new Date(event.target.value).toISOString():null})}/></label><label><span>{copy.notes}</span><textarea defaultValue={lead.notes||""} maxLength={2000} onBlur={(event)=>void updateLead(lead,{notes:event.target.value})}/></label>{lead.email?<a href={`mailto:${lead.email}`}>{lead.email}</a>:null}{lead.website?<a href={lead.website} target="_blank" rel="noreferrer">{lead.website}</a>:null}</div>:null}
          </div>)}
        </article>
      })}
    </section>

    {coachOpen?<div className={styles.coachBackdrop} role="presentation" onMouseDown={()=>setCoachOpen(false)}>
      <section className={styles.coachPanel} role="dialog" aria-modal="true" aria-labelledby="coach-title" onMouseDown={(event)=>event.stopPropagation()}>
        <header><div><small>PRIFE • CRM • IA</small><h2 id="coach-title">{copilot.title}</h2></div><button type="button" aria-label="Fechar" onClick={()=>setCoachOpen(false)}>×</button></header>
        <p>{copilot.description}</p>

        <div className={styles.coachGrid}>
          <label>{copilot.lead}<select value={coachLeadId} onChange={(event)=>{const next=event.target.value;setCoachLeadId(next);setCoachAnswer("");setCoachCustomerMessage("");void loadCoachHistory(next)}}><option value="">{copilot.generic}</option>{leads.map((lead)=><option value={lead.id} key={lead.id}>{lead.company_name} · {lead.phone}</option>)}</select></label>
          <label>{copilot.product}<input list="prife-copilot-products" value={coachOffer} onChange={(event)=>setCoachOffer(event.target.value)} maxLength={120}/><datalist id="prife-copilot-products"><option value="auto">{copilot.auto}</option>{outreachOffers.map(([value,label])=><option value={label} key={value}/>)}</datalist></label>
        </div>

        <div className={styles.coachModeTabs}>
          {(Object.keys(copilot.modes) as Array<Exclude<AiMode,"client">>).map((mode)=><button key={mode} type="button" className={coachMode===mode?styles.coachModeActive:""} onClick={()=>setCoachMode(mode)}>{copilot.modes[mode]}</button>)}
        </div>

        <label className={styles.coachContext}>{copilot.context}<textarea value={coachContext} onChange={(event)=>setCoachContext(event.target.value)} placeholder={copilot.placeholder} maxLength={2000} onKeyDown={(event)=>{if(event.key==="Enter"&&event.ctrlKey&&!coachBusy)void runCopilot()}}/><small>Ctrl + Enter</small></label>
        {coachError?<p className={styles.coachError}>{coachError}</p>:null}
        <div className={styles.coachActions}><button className={styles.generateButton} type="button" disabled={coachBusy||!coachContext.trim()} onClick={()=>void runCopilot()}>{coachBusy?copilot.sending:copilot.modes[coachMode]}</button><button type="button" className={styles.clearMemoryButton} disabled={coachBusy} onClick={()=>void clearCoachMemory()}>{copilot.clear}</button></div>

        <div className={styles.coachMemory}><div className={styles.coachMemoryHeader}><strong>{copilot.memory}</strong><span>{coachHistory.length}</span></div>{!coachHistory.length?<p>{copilot.noMemory}</p>:coachHistory.slice(-8).map((item)=><div key={item.id} className={item.role==="assistant"?styles.memoryAssistant:styles.memoryUser}><small>{item.role==="assistant"?"IA":"Você"}</small><p>{item.content}</p></div>)}</div>

        {coachAnswer?<div className={styles.coachResult}>
          <label className={styles.coachContext}>{copilot.internal}<textarea rows={6} value={coachAnswer} onChange={(event)=>setCoachAnswer(event.target.value)}/></label>
          {!coachCustomerMessage?<button type="button" className={styles.transformButton} disabled={coachBusy} onClick={()=>void runCopilot("client")}>{copilot.transform}</button>:null}
        </div>:null}

        {coachCustomerMessage?<div className={styles.coachResult}>
          <label className={styles.coachContext}>{copilot.client}<textarea rows={7} value={coachCustomerMessage} onChange={(event)=>{setCoachCustomerMessage(event.target.value);setCoachCopied(false)}}/></label>
          <div className={styles.coachActions}>
            <button type="button" onClick={()=>void copyCoachMessage()}>{coachCopied?copilot.copied:copilot.copy}</button>
            {coachPhone?<a className={coachWhatsAppUrl?styles.whatsappButton:styles.whatsappDisabled} href={coachWhatsAppUrl||undefined} target="_blank" rel="noreferrer" aria-disabled={!coachWhatsAppUrl} onClick={(event)=>{if(!coachWhatsAppUrl)event.preventDefault()}}><span className={styles.whatsappIcon}><WhatsAppIcon/></span><span className={styles.whatsappText}><strong>{copilot.whatsapp}</strong><small>{coachLead?.phone}</small></span><span className={styles.whatsappArrow} aria-hidden="true">›</span></a>:null}
          </div>
        </div>:null}
      </section>
    </div>:null}
  </main>
}

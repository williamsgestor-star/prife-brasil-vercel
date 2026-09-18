import type { Metadata } from "next";

export const metadata: Metadata = { title: "Acesso indisponível", description: "Aviso de recurso ainda não liberado para este espaço Prife.", robots: { index: false, follow: false } };

export default function AccessUnavailablePage() {
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,color:"#eefbff",background:"#010821",textAlign:"center"}}><section><h1>Acesso temporariamente indisponível</h1><p style={{color:"#92a9ca"}}>Este espaço está bloqueado, vencido ou o recurso não está liberado. Para regularizar o acesso, fale com a administração Prife Brasil.</p><a href="/" style={{color:"#35e4f2"}}>Voltar ao site</a></section></main>;
}

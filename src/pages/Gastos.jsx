import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const MESES_ORDEM = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const EMOJI = { Casa:"🏠", Elétrica:"⚡", Chácara:"🌿", Faculdade:"🎓", Trabalho:"💼", Pessoal:"👤", Saúde:"🏥", Financeiro:"💰", Outros:"📌" };
const fmt = v => `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export default function Gastos() {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState("Todos");
  const [mesSel, setMesSel] = useState("");
  const [mesesDisponiveis, setMesesDisponiveis] = useState([]);

  useEffect(() => { carregarMeses(); }, []);
  useEffect(() => { if (mesSel) carregar(); }, [mesSel]);

  async function carregarMeses() {
    const { data } = await supabase.from("gastos").select("mes");
    const unicos = [...new Set((data || []).map(g => g.mes).filter(Boolean))];
    const ordenados = MESES_ORDEM.filter(m => unicos.includes(m));
    setMesesDisponiveis(ordenados);
    if (ordenados.length > 0) setMesSel(ordenados[ordenados.length - 1]);
  }

  async function carregar() {
    setLoading(true);
    const { data } = await supabase
      .from("gastos")
      .select("*")
      .eq("mes", mesSel)
      .order("data");
    setGastos(data || []);
    setLoading(false);
  }

  async function excluir(id) {
    await supabase.from("gastos").delete().eq("id", id);
    carregar();
  }

  const filtrados = gastos.filter(g => {
    if (tipoFiltro === "Fixa") return g.tipo === "fixa";
    if (tipoFiltro === "Variável") return g.tipo === "variavel";
    return true;
  });

  const total = filtrados.reduce((s, g) => s + Number(g.valor || 0), 0);
  const fixas = gastos.filter(g => g.tipo === "fixa").reduce((s, g) => s + Number(g.valor || 0), 0);
  const variaveis = gastos.filter(g => g.tipo === "variavel").reduce((s, g) => s + Number(g.valor || 0), 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1e1e2e]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-base font-semibold">Controle de Gastos</div>
            <div className="text-xs text-[#4a4a6a] mt-0.5">{filtrados.length} lançamentos · {mesSel}</div>
          </div>
          {/* Seletor de mês */}
          <div className="flex gap-2 flex-wrap">
            {mesesDisponiveis.map(m => (
              <button key={m} onClick={() => setMesSel(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                  ${mesSel === m ? "border-[#6c5fff] bg-[#6c5fff22] text-[#a78bfa]" : "border-[#2a2a3e] text-[#6a6a8a] hover:border-[#3a3a50]"}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {[
            { label: "Total do Mês", valor: fmt(fixas + variaveis), cor: "text-red-400", icon: "💸" },
            { label: "Despesas Fixas", valor: fmt(fixas), cor: "text-orange-400", icon: "📌" },
            { label: "Despesas Variáveis", valor: fmt(variaveis), cor: "text-violet-400", icon: "🛒" },
          ].map((c, i) => (
            <div key={i} className="bg-[#13131e] border border-[#1e1e2e] rounded-xl p-4">
              <div className="text-xs text-[#4a4a6a] mb-2">{c.icon} {c.label}</div>
              <div className={`font-mono text-xl font-medium ${c.cor}`}>{c.valor}</div>
            </div>
          ))}
        </div>

        {/* Filtros tipo */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] text-[#4a4a6a] tracking-wider">TIPO</span>
          {["Todos","Fixa","Variável"].map(f => (
            <button key={f} onClick={() => setTipoFiltro(f)}
              className={`px-3 py-1 rounded-full text-xs border transition-all
                ${tipoFiltro === f ? "border-[#6c5fff] bg-[#6c5fff22] text-[#a78bfa]" : "border-[#2a2a3e] text-[#6a6a8a] hover:border-[#3a3a50]"}`}>
              {f}
            </button>
          ))}
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="text-center text-[#4a4a6a] py-10 text-sm">Carregando...</div>
        ) : (
          <div className="bg-[#13131e] border border-[#1e1e2e] rounded-xl overflow-hidden">
            <div className="grid gap-0 px-4 py-2.5 border-b border-[#1e1e2e] text-[10px] text-[#4a4a6a] tracking-wider"
              style={{ gridTemplateColumns: "70px 1fr 110px 130px 110px 80px 30px" }}>
              <span>DATA</span><span>DESCRIÇÃO</span><span>VALOR</span><span>PAGAMENTO</span><span>CATEGORIA</span><span>TIPO</span><span />
            </div>
            {filtrados.length === 0 ? (
              <div className="text-center text-[#4a4a6a] py-10 text-sm">Nenhum gasto encontrado ✨</div>
            ) : filtrados.map((g, i) => (
              <div key={g.id}
                className={`grid items-center px-4 py-3 text-sm hover:bg-[#1a1a28] transition-colors ${i < filtrados.length - 1 ? "border-b border-[#1a1a24]" : ""}`}
                style={{ gridTemplateColumns: "70px 1fr 110px 130px 110px 80px 30px" }}>
                <span className="font-mono text-xs text-[#6a6a8a]">{g.data}</span>
                <span className="text-[#d8d8f0] font-medium truncate pr-2">{g.descricao}</span>
                <span className="font-mono text-red-400 font-semibold">{fmt(g.valor)}</span>
                <span className="text-xs text-[#8a8aaa]">{g.meio_pagamento === "Nubank" ? "💜 Nubank" : "🟡 Mercado Pago"}</span>
                <span className="text-xs">{EMOJI[g.categoria] || "📌"} {g.categoria}</span>
                <span className={`text-xs px-2 py-0.5 rounded w-fit ${g.tipo === "fixa" ? "bg-orange-400/10 text-orange-400" : "bg-violet-400/10 text-violet-400"}`}>
                  {g.tipo === "fixa" ? "Fixa" : "Variável"}
                </span>
                <button onClick={() => excluir(g.id)} className="text-[#3a3a50] hover:text-red-400 transition-colors text-sm">✕</button>
              </div>
            ))}
            {/* Total */}
            {filtrados.length > 0 && (
              <div className="px-4 py-3 border-t border-[#2a2a3e] flex justify-end">
                <span className="font-mono text-sm font-semibold text-red-400">{fmt(total)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

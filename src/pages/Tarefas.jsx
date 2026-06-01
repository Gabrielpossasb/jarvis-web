import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const EMOJI = { Casa:"🏠", Elétrica:"⚡", Chácara:"🌿", Faculdade:"🎓", Trabalho:"💼", Pessoal:"👤", Saúde:"🏥", Financeiro:"💰", Outros:"📌" };

export default function Tarefas() {
  const [tarefas, setTarefas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catFiltro, setCatFiltro] = useState("Todas");
  const [statusFiltro, setStatusFiltro] = useState("Pendente");
  const [dataFiltro, setDataFiltro] = useState("Todas");

  const hoje = new Date().toLocaleDateString("pt-BR", { day:"2-digit", month:"short" })
    .replace(". de ", "/").replace(".", "").replace(" de ", "/");

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from("tarefas").select("*").order("id"),
      supabase.from("categorias").select("nome, emoji").order("nome"),
    ]);
    setTarefas(t || []);
    setCategorias(c || []);
    setLoading(false);
  }

  async function toggleConcluir(tarefa) {
    const ehRecorrente = tarefa.recorrente && tarefa.recorrente !== "Não";
    if (ehRecorrente) {
      await supabase.from("tarefas").update({ data_conclusao: hoje }).eq("id", tarefa.id);
    } else {
      const novoStatus = tarefa.status === "Concluída" ? "Pendente" : "Concluída";
      await supabase.from("tarefas").update({ status: novoStatus }).eq("id", tarefa.id);
    }
    carregar();
  }

  async function excluir(id) {
    await supabase.from("tarefas").delete().eq("id", id);
    carregar();
  }

  const filtradas = tarefas.filter(t => {
    if (catFiltro !== "Todas" && t.categoria !== catFiltro) return false;
    if (statusFiltro === "Pendente" && t.status === "Concluída") return false;
    if (statusFiltro === "Concluída" && t.status !== "Concluída") return false;
    if (dataFiltro === "Hoje" && t.data !== hoje) return false;
    if (dataFiltro === "Backlog" && t.data !== "backlog") return false;
    if (dataFiltro === "Recorrentes" && (!t.recorrente || t.recorrente === "Não")) return false;
    return true;
  });

  const pendentes = tarefas.filter(t => t.status !== "Concluída").length;
  const hoje_count = tarefas.filter(t => t.data === hoje && t.status !== "Concluída").length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1e1e2e]">
        <div className="text-base font-semibold">Tarefas</div>
        <div className="text-xs text-[#4a4a6a] mt-0.5">{pendentes} pendentes · {hoje_count} para hoje</div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Filtros */}
        <div className="flex flex-wrap gap-4 mb-5">
          {/* Data */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-[#4a4a6a] tracking-wider">DATA</span>
            {["Todas","Hoje","Backlog","Recorrentes"].map(f => (
              <button key={f} onClick={() => setDataFiltro(f)}
                className={`px-3 py-1 rounded-full text-xs border transition-all
                  ${dataFiltro === f ? "border-[#6c5fff] bg-[#6c5fff22] text-[#a78bfa]" : "border-[#2a2a3e] text-[#6a6a8a] hover:border-[#3a3a50]"}`}>
                {f}
              </button>
            ))}
          </div>
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#4a4a6a] tracking-wider">STATUS</span>
            {["Todas","Pendente","Concluída"].map(s => (
              <button key={s} onClick={() => setStatusFiltro(s)}
                className={`px-3 py-1 rounded-full text-xs border transition-all
                  ${statusFiltro === s ? "border-[#6c5fff] bg-[#6c5fff22] text-[#a78bfa]" : "border-[#2a2a3e] text-[#6a6a8a] hover:border-[#3a3a50]"}`}>
                {s}
              </button>
            ))}
          </div>
          {/* Categoria */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-[#4a4a6a] tracking-wider">CATEGORIA</span>
            {["Todas", ...categorias.map(c => c.nome)].map(c => (
              <button key={c} onClick={() => setCatFiltro(c)}
                className={`px-3 py-1 rounded-full text-xs border transition-all
                  ${catFiltro === c ? "border-[#6c5fff] bg-[#6c5fff22] text-[#a78bfa]" : "border-[#2a2a3e] text-[#6a6a8a] hover:border-[#3a3a50]"}`}>
                {c !== "Todas" ? (EMOJI[c] || "📌") + " " : ""}{c}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-center text-[#4a4a6a] py-10 text-sm">Carregando...</div>
        ) : filtradas.length === 0 ? (
          <div className="text-center text-[#4a4a6a] py-10 text-sm">Nenhuma tarefa encontrada ✨</div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtradas.map(t => (
              <div key={t.id}
                className={`flex items-center gap-3 px-4 py-3 bg-[#13131e] border border-[#1e1e2e] rounded-xl hover:bg-[#1a1a28] transition-colors ${t.status === "Concluída" ? "opacity-50" : ""}`}>
                {/* Checkbox */}
                <button onClick={() => toggleConcluir(t)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
                    ${t.status === "Concluída" ? "border-emerald-400 bg-emerald-400" : "border-[#3a3a50] hover:border-[#6c5fff]"}`}>
                  {t.status === "Concluída" && <span className="text-[10px] text-[#0f0f13] font-bold">✓</span>}
                </button>

                {/* Descrição */}
                <span className={`flex-1 text-sm ${t.status === "Concluída" ? "line-through text-[#4a4a6a]" : ""}`}>
                  {t.descricao.charAt(0) + t.descricao.slice(1).toLowerCase()}
                </span>

                {/* Tags */}
                <div className="flex items-center gap-2 shrink-0">
                  {t.hora && (
                    <span className="text-xs font-mono text-[#6c5fff] bg-[#6c5fff15] px-2 py-0.5 rounded">⏰ {t.hora}</span>
                  )}
                  {t.recorrente && t.recorrente !== "Não" && (
                    <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">🔁</span>
                  )}
                  <span className="text-xs bg-[#1e1e2e] px-2.5 py-0.5 rounded-full text-[#8a8aaa]">
                    {EMOJI[t.categoria] || "📌"} {t.categoria}
                  </span>
                  <span className={`text-xs font-mono min-w-[60px] text-right ${t.data === "backlog" ? "text-[#4a4a6a]" : "text-[#a78bfa]"}`}>
                    {t.data === "backlog" ? "sem data" : t.data}
                  </span>
                  {/* Excluir */}
                  <button onClick={() => excluir(t.id)}
                    className="text-[#3a3a50] hover:text-red-400 transition-colors text-sm ml-1">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

const MESES_ORDEM = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const JARVIS_URL = import.meta.env.VITE_JARVIS_URL || "https://web-production-f30e8.up.railway.app";
const fmt = v => `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const CORES_CAT = {
  "Assinaturas": "#6c5fff", "Cartão/Fatura": "#f87171",
  "Dívidas/Empréstimo": "#fb923c", "Transporte": "#34d399",
  "Alimentação": "#fbbf24", "Relacionamento": "#f472b6",
  "Presentes": "#a78bfa", "Cuidados Pessoais": "#38bdf8",
  "Saúde": "#4ade80", "Outros": "#94a3b8",
};

export default function Gastos() {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState("Todos");
  const [mesSel, setMesSel] = useState("");
  const [mesesDisponiveis, setMesesDisponiveis] = useState([]);

  // Extrato
  const [modalExtrato, setModalExtrato] = useState(false);
  const [extratoLoading, setExtratoLoading] = useState(false);
  const [extratoResultado, setExtratoResultado] = useState(null); // { novas, duplicatas }
  const [selecionadas, setSelecionadas] = useState({});
  const [confirmando, setConfirmando] = useState(false);
  const fileRef = useRef();

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
    const { data } = await supabase.from("gastos").select("*").eq("mes", mesSel).order("data");
    setGastos(data || []);
    setLoading(false);
  }

  async function excluir(id) {
    await supabase.from("gastos").delete().eq("id", id);
    carregar();
  }

  // ── Upload de extrato ─────────────────────────────────────────
  async function analisarExtrato(file) {
    setExtratoLoading(true);
    setExtratoResultado(null);

    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      const response = await fetch(`${JARVIS_URL}/api/extrato/analisar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mimetype: file.type }),
      });

      const data = await response.json();
      if (data.erro) throw new Error(data.erro);

      setExtratoResultado(data);

      // Marca todas as novas como selecionadas por padrão
      const sel = {};
      data.novas.forEach((_, i) => { sel[i] = true; });
      setSelecionadas(sel);
    } catch (err) {
      alert("Erro ao analisar extrato: " + err.message);
    }
    setExtratoLoading(false);
  }

  async function confirmarExtrato() {
    if (!extratoResultado) return;
    setConfirmando(true);

    const paraAdicionar = extratoResultado.novas.filter((_, i) => selecionadas[i]);
    if (paraAdicionar.length === 0) {
      alert("Selecione pelo menos uma transação.");
      setConfirmando(false);
      return;
    }

    try {
      const response = await fetch(`${JARVIS_URL}/api/extrato/confirmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transacoes: paraAdicionar }),
      });
      const data = await response.json();
      if (data.erro) throw new Error(data.erro);

      setModalExtrato(false);
      setExtratoResultado(null);
      await carregarMeses();
      alert(`✅ ${data.adicionados} gastos adicionados com sucesso!`);
    } catch (err) {
      alert("Erro ao confirmar: " + err.message);
    }
    setConfirmando(false);
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
          <div className="flex items-center gap-3 flex-wrap">
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
            {/* Botão importar extrato */}
            <button onClick={() => setModalExtrato(true)}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#6c5fff] hover:bg-[#7c6fff] rounded-lg text-xs font-semibold text-white transition-colors">
              📤 Importar extrato
            </button>
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
                <span className="text-xs px-2 py-0.5 rounded w-fit"
                  style={{ background: `${CORES_CAT[g.categoria] || "#6c5fff"}20`, color: CORES_CAT[g.categoria] || "#6c5fff" }}>
                  {g.categoria}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded w-fit ${g.tipo === "fixa" ? "bg-orange-400/10 text-orange-400" : "bg-violet-400/10 text-violet-400"}`}>
                  {g.tipo === "fixa" ? "Fixa" : "Variável"}
                </span>
                <button onClick={() => excluir(g.id)} className="text-[#3a3a50] hover:text-red-400 transition-colors text-sm">✕</button>
              </div>
            ))}
            {filtrados.length > 0 && (
              <div className="px-4 py-3 border-t border-[#2a2a3e] flex justify-end">
                <span className="font-mono text-sm font-semibold text-red-400">{fmt(total)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal de extrato ────────────────────────────────────── */}
      {modalExtrato && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#12121a] border border-[#2a2a3e] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            {/* Header modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e2e]">
              <div>
                <div className="font-semibold">Importar Extrato</div>
                <div className="text-xs text-[#4a4a6a] mt-0.5">PDF ou foto do extrato Nubank / Mercado Pago</div>
              </div>
              <button onClick={() => { setModalExtrato(false); setExtratoResultado(null); }}
                className="text-[#6a6a8a] hover:text-[#e8e8f0] transition-colors text-lg">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {!extratoResultado ? (
                /* Upload */
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-[#2a2a3e] hover:border-[#6c5fff] rounded-xl p-10 text-center cursor-pointer transition-all group">
                  <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden"
                    onChange={e => e.target.files[0] && analisarExtrato(e.target.files[0])} />
                  {extratoLoading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-[#6c5fff] border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-[#6a6a8a]">Analisando extrato com IA...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-4xl">📤</span>
                      <div>
                        <div className="text-sm font-medium text-[#c8c8e0] group-hover:text-[#a78bfa] transition-colors">
                          Clique para selecionar o arquivo
                        </div>
                        <div className="text-xs text-[#4a4a6a] mt-1">PDF ou imagem (JPG, PNG) · Nubank ou Mercado Pago</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Resultado */
                <div className="flex flex-col gap-4">
                  {/* Novas transações */}
                  {extratoResultado.novas.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs text-[#4a4a6a] tracking-wider">
                          ✅ {extratoResultado.novas.length} NOVAS TRANSAÇÕES
                        </div>
                        <button
                          onClick={() => {
                            const allSel = Object.values(selecionadas).every(v => v);
                            const novo = {};
                            extratoResultado.novas.forEach((_, i) => { novo[i] = !allSel; });
                            setSelecionadas(novo);
                          }}
                          className="text-xs text-[#6c5fff] hover:text-[#a78bfa]">
                          {Object.values(selecionadas).every(v => v) ? "Desmarcar todas" : "Selecionar todas"}
                        </button>
                      </div>
                      <div className="flex flex-col gap-2">
                        {extratoResultado.novas.map((t, i) => (
                          <div key={i}
                            onClick={() => setSelecionadas(s => ({ ...s, [i]: !s[i] }))}
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                              ${selecionadas[i] ? "border-[#6c5fff] bg-[#6c5fff10]" : "border-[#1e1e2e] hover:border-[#3a3a50]"}`}>
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all
                              ${selecionadas[i] ? "border-[#6c5fff] bg-[#6c5fff]" : "border-[#3a3a50]"}`}>
                              {selecionadas[i] && <span className="text-[10px] text-white font-bold">✓</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-[#d8d8f0] truncate">{t.descricao}</div>
                              <div className="text-xs text-[#6a6a8a] mt-0.5">
                                {t.data} · {t.meio_pagamento === "Nubank" ? "💜" : "🟡"} {t.meio_pagamento}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-mono text-sm text-red-400 font-semibold">{fmt(t.valor)}</div>
                              <div className="text-xs px-2 py-0.5 rounded mt-1"
                                style={{ background: `${CORES_CAT[t.categoria] || "#6c5fff"}20`, color: CORES_CAT[t.categoria] || "#6c5fff" }}>
                                {t.categoria}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Duplicatas */}
                  {extratoResultado.duplicatas.length > 0 && (
                    <div>
                      <div className="text-xs text-[#4a4a6a] tracking-wider mb-3">
                        ⚠️ {extratoResultado.duplicatas.length} POSSÍVEIS DUPLICATAS (não serão adicionadas)
                      </div>
                      <div className="flex flex-col gap-2">
                        {extratoResultado.duplicatas.map((t, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-[#1e1e2e] opacity-50">
                            <div className="w-4 h-4 rounded border-2 border-red-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-[#d8d8f0] truncate">{t.descricao}</div>
                              <div className="text-xs text-[#6a6a8a] mt-0.5">{t.data}</div>
                            </div>
                            <span className="font-mono text-sm text-red-400">{fmt(t.valor)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer modal */}
            {extratoResultado && (
              <div className="px-6 py-4 border-t border-[#1e1e2e] flex items-center justify-between">
                <div className="text-xs text-[#6a6a8a]">
                  {Object.values(selecionadas).filter(v => v).length} selecionadas ·{" "}
                  {fmt(extratoResultado.novas.filter((_, i) => selecionadas[i]).reduce((s, t) => s + t.valor, 0))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setExtratoResultado(null); setSelecionadas({}); }}
                    className="px-4 py-2 text-xs text-[#6a6a8a] hover:text-[#e8e8f0] transition-colors">
                    Voltar
                  </button>
                  <button onClick={confirmarExtrato} disabled={confirmando}
                    className="px-5 py-2 bg-[#6c5fff] hover:bg-[#7c6fff] disabled:opacity-50 rounded-lg text-xs font-semibold text-white transition-colors">
                    {confirmando ? "Adicionando..." : `Adicionar ${Object.values(selecionadas).filter(v => v).length} gastos`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

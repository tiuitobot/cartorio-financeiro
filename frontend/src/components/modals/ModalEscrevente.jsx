import { useState } from 'react';
import { FInput, Btn } from '../ui/index.jsx';

export default function ModalEscrevente({ init, onClose, onSave, todosEscreventes }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ taxa_vigencia_inicio: init?.taxa_vigencia_inicio || today, ...init });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const outros = todosEscreventes.filter(e => e.id !== init.id);
  const historicoTaxas = Array.isArray(init.taxas_historico) ? init.taxas_historico : [];
  const taxaMudou = !!init.id && Number(form.taxa) !== Number(init.taxa);

  const toggleCompartilhar = (id) => {
    const atual = form.compartilhar_com || [];
    setForm(f => ({ ...f, compartilhar_com: atual.includes(id) ? atual.filter(x => x !== id) : [...atual, id] }));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000060', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 48px #0f2a5540' }}>
        <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2d5a9e)', padding: '22px 28px', borderRadius: '18px 18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#93c5fd', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{!init.id ? 'Novo' : 'Editar'} Escrevente</div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginTop: 2 }}>{init.nome || 'Novo Escrevente'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FInput label="Nome completo" value={form.nome || ''} onChange={e => set('nome', e.target.value)} />
          <FInput label="Cargo" value={form.cargo || ''} onChange={e => set('cargo', e.target.value)} />
          <FInput label="E-mail" value={form.email || ''} onChange={e => set('email', e.target.value)} />
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Taxa Contratual</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[6, 20, 30].map(t => (
                <button key={t} onClick={() => set('taxa', t)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `2px solid ${form.taxa === t ? '#1e3a5f' : '#e2e8f0'}`, background: form.taxa === t ? '#1e3a5f' : '#f8fafc', color: form.taxa === t ? '#fff' : '#64748b', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>{t}%</button>
              ))}
            </div>
          </div>
          {!!init.id && outros.length > 0 && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Compartilhar meus atos com</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto', padding: 4 }}>
                {outros.map(e => (
                  <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', padding: '6px 10px', borderRadius: 8, background: (form.compartilhar_com || []).includes(e.id) ? '#dbeafe' : '#f8fafc', border: `1px solid ${(form.compartilhar_com || []).includes(e.id) ? '#93c5fd' : '#e2e8f0'}` }}>
                    <input type="checkbox" checked={(form.compartilhar_com || []).includes(e.id)} onChange={() => toggleCompartilhar(e.id)} style={{ width: 14, height: 14 }} />
                    {e.nome} <span style={{ color: '#94a3b8', fontSize: 11 }}>({e.taxa}%)</span>
                  </label>
                ))}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>Os escreventes selecionados poderão visualizar seus atos.</div>
            </div>
          )}
          {!!init.id && (
            <>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 14px', display: 'grid', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 0.7 }}>Taxa com vigência</div>
                  <div style={{ fontSize: 13, color: '#334155', marginTop: 4 }}>
                    Mudanças de taxa entram no histórico e passam a valer a partir da data escolhida.
                  </div>
                </div>
                <FInput
                  label="Vigência da taxa selecionada"
                  type="date"
                  value={form.taxa_vigencia_inicio || today}
                  onChange={(e) => set('taxa_vigencia_inicio', e.target.value)}
                />
                {taxaMudou && (
                  <div style={{ fontSize: 12, color: '#1e3a5f', fontWeight: 700 }}>
                    A nova taxa de {form.taxa}% será registrada com vigência em {form.taxa_vigencia_inicio || today}.
                  </div>
                )}
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 14px', background: '#fff' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>
                  Histórico de taxas
                </div>
                {historicoTaxas.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>Nenhum histórico registrado ainda.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {historicoTaxas.map((item) => (
                      <div key={`${item.id}-${item.vigencia_inicio}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>{item.taxa}%</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>Vigência em {item.vigencia_inicio}</div>
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
            <Btn onClick={() => { if (form.nome?.trim()) onSave(form); }}>💾 Salvar</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

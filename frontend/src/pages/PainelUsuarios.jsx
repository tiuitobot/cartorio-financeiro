import { useState, useEffect } from 'react';
import { Card, Btn, FInput, FSel, Badge, StickyXScroll } from '../components/ui/index.jsx';
import { api } from '../api.js';

const PERFIS = [
  { value: 'admin',            label: 'Admin (Tabelião)' },
  { value: 'chefe_financeiro', label: 'Chefe Financeiro' },
  { value: 'financeiro',       label: 'Financeiro' },
  { value: 'escrevente',       label: 'Escrevente' },
];

export default function PainelUsuarios({ escreventes }) {
  const [usuarios, setUsuarios] = useState([]);
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState({});
  const [msg, setMsg]           = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api.getUsuarios().then(setUsuarios).catch((e) => setLoadError(e.message || 'Erro ao carregar usuários'));
  }, []);

  const salvar = async () => {
    try {
      if (form.id) {
        const u = await api.atualizarUsuario(form.id, form);
        setUsuarios(prev => prev.map(x => x.id === u.id ? u : x));
      } else {
        const u = await api.criarUsuario(form);
        setUsuarios(prev => [...prev, u]);
      }
      setModal(null); setMsg('');
    } catch (e) { setMsg(e.message); }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Btn onClick={() => { setForm({ perfil: 'financeiro', ativo: true }); setModal('novo'); }}>＋ Novo Usuário</Btn>
      </div>
      {loadError && <div style={{ color: '#dc2626', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{loadError}</div>}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <StickyXScroll>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 980 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              {['Nome', 'E-mail', 'Perfil', 'Escrevente vinculado', 'Senha', 'Ativo', ''].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 12, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u, i) => {
              const esc = escreventes.find(e => e.id === u.escrevente_id);
              return (
                <tr key={u.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                  <td style={{ padding: '11px 14px', fontWeight: 600 }}>{u.nome}</td>
                  <td style={{ padding: '11px 14px', color: '#64748b' }}>{u.email}</td>
                  <td style={{ padding: '11px 14px' }}><Badge label={u.perfil} color="#1e3a5f" /></td>
                  <td style={{ padding: '11px 14px', color: '#64748b' }}>{esc?.nome || '—'}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <Badge label={u.precisa_trocar_senha ? 'Troca pendente' : 'OK'} color={u.precisa_trocar_senha ? '#f59e0b' : '#22c55e'} />
                  </td>
                  <td style={{ padding: '11px 14px' }}><Badge label={u.ativo ? 'Ativo' : 'Inativo'} color={u.ativo ? '#22c55e' : '#ef4444'} /></td>
                  <td style={{ padding: '11px 14px' }}>
                    <Btn variant="secondary" onClick={() => { setForm({ ...u, nova_senha: '' }); setModal('editar'); }} style={{ fontSize: 12, padding: '5px 14px' }}>✏️ Editar</Btn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </StickyXScroll>
      </Card>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000060', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 500, boxShadow: '0 8px 48px #0f2a5540' }}>
            <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2d5a9e)', padding: '20px 24px', borderRadius: '18px 18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{modal === 'novo' ? 'Novo Usuário' : 'Editar Usuário'}</div>
              <button onClick={() => { setModal(null); setMsg(''); }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <FInput label="Nome"   value={form.nome  || ''} onChange={e => set('nome',  e.target.value)} />
              <FInput label="E-mail" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} />
              {modal === 'novo'   && <FInput label="Senha inicial"                              type="password" value={form.senha     || ''} onChange={e => set('senha',     e.target.value)} />}
              {modal === 'editar' && <FInput label="Nova senha (deixe vazio para não alterar)" type="password" value={form.nova_senha || ''} onChange={e => set('nova_senha', e.target.value)} />}
              <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>
                {modal === 'novo'
                  ? 'O usuário será obrigado a trocar a senha no primeiro login.'
                  : 'Se você definir uma nova senha, o usuário será obrigado a trocá-la no próximo login.'}
              </div>
              <FSel label="Perfil" value={form.perfil || ''} onChange={e => set('perfil', e.target.value)} options={PERFIS} />
              <FSel label="Escrevente vinculado" value={form.escrevente_id || ''} onChange={e => set('escrevente_id', e.target.value ? parseInt(e.target.value) : null)}
                options={[{ value: '', label: '— Nenhum —' }, ...escreventes.map(e => ({ value: e.id, label: e.nome }))]} />
              {modal === 'editar' && (
                <FSel label="Status" value={form.ativo ? 'true' : 'false'} onChange={e => set('ativo', e.target.value === 'true')}
                  options={[{ value: 'true', label: 'Ativo' }, { value: 'false', label: 'Inativo' }]} />
              )}
              {msg && <div style={{ color: '#dc2626', fontSize: 13, fontWeight: 600 }}>{msg}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <Btn variant="secondary" onClick={() => { setModal(null); setMsg(''); }}>Cancelar</Btn>
                <Btn onClick={salvar}>💾 Salvar</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

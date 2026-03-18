import { useState } from 'react';
import { FInput } from '../components/ui/index.jsx';
import { api } from '../api.js';

export default function TelaLogin({ onLogin }) {
  const [email, setEmail]   = useState('');
  const [senha, setSenha]   = useState('');
  const [erro, setErro]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !senha) { setErro('Preencha e-mail e senha.'); return; }
    setLoading(true); setErro('');
    try {
      const data = await api.login(email, senha);
      localStorage.setItem('cartorio_token', data.token);
      onLogin(data.user);
    } catch (err) {
      setErro(err.message || 'Erro ao fazer login.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1e3a5f,#152b47)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 48, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px #00000040' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img src="/logo.png" alt="Logo" style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 16 }} />
          <div style={{ color: '#1e3a5f', fontWeight: 800, fontSize: 22 }}>Gestão Financeira</div>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Cartório de Notas</div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FInput label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" disabled={loading} />
          <FInput label="Senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" disabled={loading} />
          {erro && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, fontWeight: 600 }}>{erro}</div>}
          <button type="submit" disabled={loading} style={{ background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontWeight: 700, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 8 }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

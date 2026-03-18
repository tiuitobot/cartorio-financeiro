import { Card, Btn, Badge } from '../components/ui/index.jsx';
import { fmt } from '../utils/format.js';

export default function Escreventes({ escreventes, atos, userRole, onEditar }) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ background: '#f1f5f9' }}>
            {['Nome', 'Cargo', 'Taxa', 'Atos captados', 'Emolumentos captados', 'Compartilha com', ''].map(h => (
              <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 12, textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {escreventes.map((e, i) => {
            const atosCapt   = atos.filter(a => a.captador_id === e.id);
            const totalEmol  = atosCapt.reduce((s, a) => s + parseFloat(a.emolumentos || 0), 0);
            const compartilha = escreventes.filter(x => (e.compartilhar_com || []).includes(x.id)).map(x => x.nome.split(' ')[0]).join(', ');
            return (
              <tr key={e.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}
                onMouseOver={ev => ev.currentTarget.style.background = '#f0f7ff'}
                onMouseOut={ev  => ev.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafbfc'}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{e.nome}</td>
                <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>{e.cargo || '—'}</td>
                <td style={{ padding: '12px 16px' }}><Badge label={`${e.taxa}%`} color="#1e3a5f" /></td>
                <td style={{ padding: '12px 16px' }}>{atosCapt.length}</td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1e3a5f' }}>{fmt(totalEmol)}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>{compartilha || '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  {userRole === 'admin' && <Btn variant="secondary" onClick={() => onEditar(e)} style={{ padding: '5px 14px', fontSize: 12 }}>✏️ Editar</Btn>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

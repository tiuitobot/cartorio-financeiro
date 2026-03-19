import { apiMock } from './mock/api.mock.js';
if (import.meta.env.VITE_USE_MOCK === 'true') {
  console.info('[MOCK] API mock ativa — dados locais, sem backend.');
}

const BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

const tok = () => localStorage.getItem('cartorio_token');
const hdr = () => {
  const headers = { 'Content-Type': 'application/json' };
  const token = tok();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const authHdr = () => {
  const headers = {};
  const token = tok();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

async function req(method, path, body) {
  const opts = { method, headers: hdr() };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(`${BASE}${path}`, opts);
  if (r.status === 401) { localStorage.removeItem('cartorio_token'); window.location.reload(); }
  if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.erro || `Erro ${r.status}`); }
  return r.status === 204 ? null : r.json();
}

async function reqForm(method, path, formData) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: authHdr(),
    body: formData,
  });
  if (r.status === 401) { localStorage.removeItem('cartorio_token'); window.location.reload(); }
  if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.erro || `Erro ${r.status}`); }
  return r.status === 204 ? null : r.json();
}

const apiReal = {
  // Auth
  login:       (email, senha)   => fetch(`${BASE}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,senha}) }).then(async r => { const d=await r.json(); if(!r.ok) throw new Error(d.erro); return d; }),
  me:          ()               => req('GET',  '/auth/me'),
  trocarSenha: (atual, nova)    => req('PUT',  '/auth/senha', { senha_atual:atual, nova_senha:nova }),

  // Escreventes
  getEscreventes: ()            => req('GET',  '/escreventes'),
  criarEscrevente:(data)        => req('POST', '/escreventes', data),
  atualizarEscrevente:(id,data) => req('PUT',  `/escreventes/${id}`, data),

  // Atos
  getAtos:     (params={})      => req('GET',  `/atos?${new URLSearchParams(params)}`),
  criarAto:    (data)           => req('POST', '/atos', data),
  atualizarAto:(id, data)       => req('PUT',  `/atos/${id}`, data),

  // Reembolsos
  getReembolsos:         ()     => req('GET',  '/reembolsos'),
  criarReembolso:        (data) => req('POST', '/reembolsos', data),
  confirmarReembolso:    (id)   => req('PUT',  `/reembolsos/${id}/confirmar`, {}),

  // Reivindicações
  getReivindicacoes:    ()              => req('GET',  '/reivindicacoes'),
  criarReivindicacao:   (data)         => req('POST', '/reivindicacoes', data),
  atualizarReivindicacao:(id,data)     => req('PUT',  `/reivindicacoes/${id}`, data),

  // Importações
  getImportacoes:      (params={})     => req('GET',  `/importacoes?${new URLSearchParams(params)}`),
  getImportacao:       (id, params={}) => req('GET',  `/importacoes/${id}?${new URLSearchParams(params)}`),
  previewImportacao:   (arquivo)       => {
    const formData = new FormData();
    formData.append('arquivo', arquivo);
    return reqForm('POST', '/importacoes/planilha/preview', formData);
  },
  importarLote:        (id, data={})   => req('POST', `/importacoes/${id}/importar`, data),

  // Usuários (admin)
  getUsuarios:   ()             => req('GET',  '/usuarios'),
  criarUsuario:  (data)         => req('POST', '/usuarios', data),
  atualizarUsuario:(id,data)    => req('PUT',  `/usuarios/${id}`, data),
};

export const api = import.meta.env.VITE_USE_MOCK === 'true' ? apiMock : apiReal;

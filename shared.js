/**
 * SGME - Núcleo Compartilhado Frontend
 * Arquivo: shared.js
 */

const IS_GITHUB_PAGES = window.location.hostname.includes('github.io');
let servidorBaseUrl = "http://127.0.0.1:8083";
let usuarioLogado = null;

// Lista oficial dos 184 municípios cearenses em caixa alta
const MUNICIPIOS_CE = [
    "ABAIARA","ACARAPE","ACARAÚ","ACOPIARA","AIUABA","ALCÂNTARAS","ALTANEIRA","ALTO SANTO","AMONTADA",
    "ANTONINA DO NORTE","APUIARÉS","AQUIRAZ","ARACATI","ARACOIABA","ARARENDÁ","ARARIPE","ARATUBA","ARNEIROZ",
    "ASSARÉ","AURORA","BAIXIO","BANABUIÚ","BARBALHA","BARREIRA","BARRO","BARROQUINHA","BATURITÉ","BEBERIBE",
    "BELA CRUZ","BOA VIAGEM","BREJO SANTO","CAMOCIM","CAMPOS SALES","CANINDÉ","CAPISTRANO","CARIDADE","CARIRÉ",
    "CARIRIAÇU","CARIÚS","CARNAUBAL","CASCAVEL","CATARINA","CATUNDA","CAUCAIA","CEDRO","CHAVAL","CHORÓ",
    "CHOROVOZINHO","COREAÚ","CRATEÚS","CRATO","CROATÁ","CRUZ","DEPUTADO IRAPUAN PINHEIRO","ERERÊ","EUSÉBIO",
    "FARIAS BRITO","FORQUILHA","FORTALEZA","FORTIM","FRECHEIRINHA","GENERAL SAMPAIO","GRAÇA","GRANJA",
    "GRANJEIRO","GROAÍRAS","GUAIÚBA","GUARACIABA DO NORTE","GUARAMIRANGA","HIDROLÂNDIA","HORIZONTE","IBARETAMA",
    "IBIAPINA","IBICUITINGA","ICAPUÍ","ICÓ","IGUATU","INDEPENDÊNCIA","IPAPORANGA","IPAUMIRIM","IPU","IPUEIRAS",
    "IRACEMA","IRAUÇUBA","ITAIÇABA","ITAITINGA","ITAPAJÉ","ITAPIPOCA","ITAPIÚNA","ITAREMA","ITATIRA","JAGUARETAMA",
    "JAGUARIBARA","JAGUARIBE","JAGUARUANA","JARDIM","JATI","JIJOCA DE JERICOACOARA","JUAZEIRO DO NORTE","JUCÁS",
    "LAVRAS DA MANGABEIRA","LIMOEIRO DO NORTE","MADALENA","MARACANAÚ","MARANGUAPE","MARCO","MARTINÓPOLE","MASSAPÊ",
    "MAURITI","MERUOCA","MILAGRES","MILHÃ","MIRAÍMA","MISSÃO VELHA","MOMBAÇA","MONSENHOR TABOSA","MORADA NOVA",
    "MORAÚJO","MORRINHOS","MUCAMBO","MULUNGU","NOVA OLINDA","NOVA RUSSAS","NOVO ORIENTE","OCARA","ORÓS","PACAJUS",
    "PACATUBA","PACOTI","PACUJÁ","PALHANO","PALMÁCIA","PARACURU","PARAIPABA","PARAMBU","PARAMOTI","PEDRA BRANCA",
    "PENAFORTE","PENTECOSTE","PEREIRO","PINDORETAMA","PIQUET CARNEIRO","PIRES FERREIRA","PORANGA","PORTEIRAS",
    "POTENGI","POTIRETAMA","QUITERIANÓPOLIS","QUIXADÁ","QUIXELÔ","QUIXERAMOBIM","QUIXERÉ","REDENÇÃO","RERIUTABA",
    "RUSSAS","SABOEIRO","SALITRE","SANTA QUITÉRIA","SANTANA DO ACARAÚ","SANTANA DO CARIRI","SÃO BENEDITO",
    "SÃO GONÇALO DO AMARANTE","SÃO JOÃO DO JAGUARIBE","SÃO LUÍS DO CURU","SENADOR POMPEU","SENADOR SÁ","SOBRAL",
    "SOLONÓPOLE","TABULEIRO DO NORTE","TAMBORIL","TARRAFAS","TAUÁ","TEJUÇUOCA","TIANGUÁ","TRAIRI","TURURU",
    "UBAJARA","UMARI","UMIRIM","URUBURETAMA","URUOCA","VARJOTA","VÁRZEA ALEGRE","VIÇOSA DO CEARÁ"
];

// Sanitização contra XSS
function esc(str) {
    return str ? String(str).replace(/[&<>'"]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[m])) : '';
}

// Formatação amigável de data e hora
function dataFormatada(timestamp) {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString('pt-BR');
}

// Utilitários de interface
function fecharModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}

function fazerLogout() {
    localStorage.removeItem('os_usuario_logado');
    sessionStorage.clear();
    window.location.href = 'index.html';
}

function getApiUrl(ep) {
    return `${servidorBaseUrl}${ep}`;
}

// Inicialização central de segurança de sessão e conexão com backend
async function inicializarCore(perfilEsperado) {
    const raw = localStorage.getItem('os_usuario_logado');
    if (!raw) { 
        window.location.href = 'index.html'; 
        return null; 
    }
    
    usuarioLogado = JSON.parse(raw);
    if (!usuarioLogado || !usuarioLogado.token || (perfilEsperado && usuarioLogado.perfil !== perfilEsperado)) {
        window.location.href = 'index.html';
        return null;
    }

    const nomeDisp = document.getElementById('usuarioNomeDisplay');
    if (nomeDisp) nomeDisp.textContent = esc(usuarioLogado.nome);

    if (IS_GITHUB_PAGES) {
        try {
            const res = await fetch(`servidor.json?t=${Date.now()}`);
            const data = await res.json();
            if (data && data.url) {
                servidorBaseUrl = data.url.replace(/\/+$/, '');
            }
        } catch (err) {
            console.error("Falha ao resolver servidor.json do Cloudflare:", err);
        }
    }
    return usuarioLogado;
}

// Fetch central autenticado (suporta JSON nativo e FormData de uploads)
async function apiFetch(endpoint, options = {}) {
    if (!options.headers) options.headers = {};
    if (usuarioLogado && usuarioLogado.token) {
        options.headers['Authorization'] = `Bearer ${usuarioLogado.token}`;
    }
    
    // Se o corpo não for FormData (upload) e não possuir Content-Type definido, aplica application/json
    if (!(options.body instanceof FormData) && !options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(getApiUrl(endpoint), options);
    if (res.status === 401) {
        alert("Sessão expirada. Faça login novamente.");
        fazerLogout();
        throw new Error("401 Unauthorized");
    }
    return res;
}

// Emissão de documento oficial padrão TJCE (GMZ)
async function imprimirOSPdf(os_id) {
    let os = null; 
    let hist = [];
    try {
        const data = await (await apiFetch(`/api/os/${os_id}`)).json();
        os = data.os; 
        hist = data.historico;
    } catch(e) {
        alert("Erro ao obter informações da O.S. para impressão.");
        return;
    }

    const dataObj = new Date(os.data_abertura);
    const numOSFormatado = `${os.id}.${String(dataObj.getMonth()+1).padStart(2,'0')}.${dataObj.getFullYear()}`;
    
    let dataAprovacao = '-';
    const hAprov = hist.find(h => h.acao && h.acao.includes('APROVADA'));
    if (hAprov) { 
        const dA = new Date(hAprov.data_registro); 
        dataAprovacao = `${String(dA.getDate()).padStart(2,'0')}/${String(dA.getMonth()+1).padStart(2,'0')}/${dA.getFullYear()}`; 
    }
    
    const dataConclusao = os.data_conclusao ? new Date(os.data_conclusao).toLocaleDateString('pt-BR') : '-';
    const descCompleta = `Ar-condicionado ${os.tipo_equipamento} ${os.capacidade||''} ${os.tombo && os.tombo !== 'S/T' ? 'tombo ' + os.tombo : ''}. Defeito: ${os.descricao_falha}`;

    let histHtml = '';
    hist.forEach(h => {
        histHtml += `<div style="font-size:11px;margin-bottom:6px;border-bottom:1px dotted #ccc;"><strong>${dataFormatada(h.data_registro)} - ${esc(h.nome_usuario)} (${h.acao}):</strong> ${esc(h.observacao||'')}</div>`;
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Pop-up bloqueado pelo navegador. Permita pop-ups para visualizar a impressão.");
        return;
    }

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>OS_${numOSFormatado}</title><style>@page { size: A4 portrait; margin: 12mm 15mm; } body { font-family: Arial, sans-serif; color: #000; margin: 0; padding: 0; font-size: 11px; } .box-principal { border: 1.5px solid #000; width: 100%; border-collapse: collapse; } .box-principal td, .box-principal th { border: 1px solid #000; padding: 4px 6px; } .cabecalho-doc { text-align: center; font-weight: bold; font-size: 12px; } .titulo-sub { font-size: 11px; font-weight: bold; text-align: center; } .label-col { font-weight: bold; text-align: center; background: #fcfcfc; width: 35%; font-size: 10px; } .val-col { text-align: center; font-weight: 500; font-size: 11px; } .banner-lateral { width: 30px; text-align: center; vertical-align: middle; font-weight: bold; font-size: 12px; letter-spacing: 2px; writing-mode: vertical-rl; transform: rotate(180deg); } .secao-header { background: #fff; font-weight: bold; text-align: center; font-size: 11px; padding: 5px !important; } .rodape-os { margin-top: 15px; text-align: right; font-weight: bold; font-size: 14px; } @media print { .no-print { display: none !important; } }</style></head><body><div class="no-print" style="text-align:center;margin-bottom:20px;"><button style="background:#0284c7;color:#fff;padding:10px 20px;font-weight:bold;border:none;cursor:pointer;border-radius:4px;" onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div><div style="text-align:right;font-size:14px;font-weight:bold;margin-bottom:4px;">${os.id}</div><table class="box-principal"><tr><td colspan="3" class="cabecalho-doc">ESTADO DO CEARÁ - PODER JUDICIÁRIO</td></tr><tr><td colspan="3" class="titulo-sub">TRIBUNAL DE JUSTIÇA - GERÊNCIA DE MANUTENÇÃO E ZELADORIA</td></tr><tr><td rowspan="20" class="banner-lateral">ABERTURA</td><td class="label-col">Nº da OS</td><td class="val-col"><strong>${numOSFormatado}</strong></td></tr><tr><td class="label-col">ATENDENTE</td><td class="val-col">${esc(os.nome_solicitante)}</td></tr><tr><td class="label-col">MATRÍCULA DO ATENDENTE</td><td class="val-col">-</td></tr><tr><td colspan="2" class="secao-header">LOCALIZAÇÃO</td></tr><tr><td class="label-col">REQUISITANTE</td><td class="val-col">${esc(os.nome_solicitante)}</td></tr><tr><td class="label-col">MATRÍCULA DO REQUISITANTE</td><td class="val-col">-</td></tr><tr><td class="label-col">TELEFONE/RAMAL CONTATO</td><td class="val-col">0</td></tr><tr><td class="label-col">LOTAÇÃO</td><td class="val-col">${esc(os.sala)}</td></tr><tr><td class="label-col">MUNICÍPIO</td><td class="val-col">${esc(os.comarca)}</td></tr><tr><td class="label-col">REGIÃO</td><td class="val-col">Região I</td></tr><tr><td class="label-col">PRÉDIO</td><td class="val-col">${esc(os.predio)}</td></tr><tr><td class="label-col">LOCAL DE OCORRÊNCIA</td><td class="val-col">${esc(os.sala)}</td></tr><tr><td class="label-col">TIPO DE SOLICITACAO</td><td class="val-col">Manutenção de Equipamento</td></tr><tr><td class="label-col">SERVIÇO</td><td class="val-col">Climatização</td></tr><tr><td class="label-col">CPA/TOMBO</td><td class="val-col"><strong>${esc(os.tombo)}</strong></td></tr><tr><td class="label-col">PRIORIDADE</td><td class="val-col">Não Emergencial</td></tr><tr><td class="label-col">FORNECEDOR</td><td class="val-col">${esc(os.contrato_nome || '-')}</td></tr><tr><td class="label-col">DESCRIÇÃO</td><td class="val-col" style="font-size:10px;">${esc(descCompleta)}</td></tr><tr><td class="label-col">DATA DE APROVAÇÃO</td><td class="val-col">${dataAprovacao}</td></tr><tr><td class="label-col">DATA DE INÍCIO</td><td class="val-col">${dataObj.toLocaleDateString('pt-BR')}</td></tr><tr><td colspan="2" class="label-col">DATA DE CONCLUSÃO</td><td class="val-col">${dataConclusao}</td></tr></table><table class="box-principal" style="border-top:none;margin-top:-1px;"><tr><td class="secao-header">DESCRIÇÃO</td></tr><tr><td style="height:45px;vertical-align:top;padding:6px;">${esc(descCompleta)}</td></tr><tr><td class="secao-header">HISTÓRICO</td></tr><tr><td style="min-height:80px;vertical-align:top;padding:6px;">${histHtml || 'Nenhum histórico.'}</td></tr></table><table class="box-principal" style="border-top:none;margin-top:-1px;"><tr><td class="secao-header" style="width:50%;">ATENDENTE</td><td class="secao-header" style="width:50%;">Executor</td></tr><tr><td style="height:50px;vertical-align:bottom;"><strong>Nome:</strong> ${esc(os.nome_solicitante)}<br><strong>Matrícula:</strong></td><td style="height:50px;vertical-align:bottom;"><strong>Nome:</strong> ${esc(os.nome_executante || '')}<br><strong>CPF:</strong></td></tr></table><div class="rodape-os">Nº da OS: ${numOSFormatado}</div></body></html>`);
    printWindow.document.close();
    printWindow.focus();
}
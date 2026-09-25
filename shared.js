/**
 * SGME - Núcleo Compartilhado Frontend
 * Arquivo: shared.js (Versão 2.7 - Formato Oficial OS_XXXX.MM.AAAA.pdf)
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

// Sanitização estrita contra XSS
function esc(str) {
    return str ? String(str).replace(/[&<>'"]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[m])) : '';
}

// Formatação oficial do identificador da O.S.: OS_XXXX.MM.AAAA (ex: OS_0017.09.2026)
function formatarNumOS(id, timestamp) {
    if (!id) return '';
    const d = timestamp ? new Date(timestamp) : new Date();
    const seq = String(id).padStart(4, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const aaaa = d.getFullYear();
    return `OS_${seq}.${mm}.${aaaa}`;
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

// Inicialização central de segurança de sessão e resolução de URL do Cloudflare
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
            console.error("Falha ao resolver servidor.json:", err);
        }
    }
    return usuarioLogado;
}

// Cliente HTTP com Bearer Token e suporte automático a JSON e FormData
async function apiFetch(endpoint, options = {}) {
    if (!options.headers) options.headers = {};
    if (usuarioLogado && usuarioLogado.token) {
        options.headers['Authorization'] = `Bearer ${usuarioLogado.token}`;
    }
    
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

// Emissão e download direto do PDF no padrão oficial OS_XXXX.MM.AAAA.pdf (sem expor Cloudflare ou Token)
async function imprimirOSPdf(os_id, data_abertura = null) {
    if (!usuarioLogado || !usuarioLogado.token) {
        alert("Usuário não autenticado.");
        return;
    }

    try {
        // 1. Baixa o binário do PDF via AJAX seguro com o token no header
        const res = await apiFetch(`/api/os/${os_id}/pdf`);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.erro || "Falha ao gerar o documento PDF.");
        }

        // 2. Recupera o nome oficial enviado pelo backend (ex: OS_0017.09.2026.pdf) ou gera pelo formatador
        let nomeArquivo = res.headers.get('X-Filename');
        if (!nomeArquivo) {
            nomeArquivo = `${formatarNumOS(os_id, data_abertura)}.pdf`;
        }

        // 3. Converte a resposta em um Blob local do navegador
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        // 4. Dispara o download com o nome padronizado
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 5. Libera a memória alocada
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30000);

    } catch (err) {
        alert("Erro ao obter PDF: " + err.message);
    }
}